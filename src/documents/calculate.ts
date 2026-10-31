import type { CatalogEntry } from '../catalogs/catalog';
import type { DetraccionEntry } from '../catalogs/detraccion';
import type { IgvRegime } from '../catalogs/igv';
import { Igv } from '../catalogs/igv';
import { Affectation, Currency, DocumentType, Identity, Unit } from '../catalogs/shared';
import { Rounding, type RoundingValue } from '../options';
import { type Issue, issue, TribuError } from '../results/tribu-error';
import { Decimal } from './decimal';
import { Dni } from './dni';
import type {
  CreditNote,
  DebitNote,
  Detraccion,
  Document,
  IdentifiedCustomer,
  Installment,
  Invoice,
  Item,
  Payment,
  Receipt,
  TaxScheme,
  Totals,
} from './document';
import { badNumber, isDocumentNumber } from './document-id';
import { Money } from './money';
import { anonymousCustomer } from './predicates';
import { Ruc } from './ruc';

export interface SeriesConfig {
  readonly invoice: string;
  readonly receipt: string;
  readonly creditNote: { readonly invoice: string; readonly receipt: string };
  readonly debitNote: { readonly invoice: string; readonly receipt: string };
}

export interface CalculationSettings {
  readonly issuer: {
    readonly ruc: Ruc;
    readonly name: string;
    readonly ubigeo: string;
    readonly igv?: IgvRegime;
    readonly detraccionAccount?: string;
  };
  readonly defaults: { readonly unit: CatalogEntry; readonly affectation: CatalogEntry };
  readonly rounding: RoundingValue;
  readonly today: string;
  readonly series?: SeriesConfig;
}

export interface ItemInput {
  readonly description: string;
  readonly quantity: number | string | Decimal;
  readonly price?: number | string | Decimal | Money;
  readonly value?: number | string | Decimal | Money;
  readonly unit?: CatalogEntry;
  readonly affectation?: CatalogEntry;
  readonly classification?: string;
}

export interface CustomerInput {
  readonly name?: string;
  readonly ruc?: string | Ruc;
  readonly dni?: string | Dni;
  readonly ce?: string;
  readonly passport?: string;
  readonly id?: CatalogEntry;
  readonly number?: string;
}

export interface InstallmentInput {
  readonly amount: number | string | Decimal | Money;
  readonly due: string;
}

export interface RecordLike {
  readonly id: string;
  readonly document?: Document;
  readonly status?: unknown;
}

export interface DocumentInput {
  readonly customer?: CustomerInput | undefined;
  readonly items?: readonly ItemInput[];
  readonly number?: number;
  readonly issueDate?: string;
  readonly currency?: CatalogEntry;
  readonly series?: string;
  readonly payment?: { readonly installments: readonly InstallmentInput[] };
  readonly modifies?: string | RecordLike | undefined;
  readonly reason?: CatalogEntry;
  readonly detraccion?: DetraccionEntry;
}

const DEFAULT_SERIES: SeriesConfig = {
  invoice: 'F001',
  receipt: 'B001',
  creditNote: { invoice: 'FC01', receipt: 'BC01' },
  debitNote: { invoice: 'FD01', receipt: 'BD01' },
};

const ZERO = Decimal.from(0);
const ONE = Decimal.from(1);
const HUNDRED = Decimal.from(100);

/**
 * A real calendar date as YYYY-MM-DD. The deadline Rules compare dates by day count, and a text
 * that is not a date gives NaN, which no `>` or `<` ever flags: it would pass every Rule.
 */
function isIsoDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function badDate(path: string, value: unknown): Issue {
  return issue(
    path,
    'tribu',
    `"${String(value)}" is not a date in the form YYYY-MM-DD.`,
    'Pass a real date such as "2026-10-31".',
    'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  );
}

function amountOf(value: number | string | Decimal | Money): Decimal {
  return value instanceof Money ? value.amount : Decimal.from(value);
}

function currencyOf(value: number | string | Decimal | Money): CatalogEntry | undefined {
  return value instanceof Money ? value.currency : undefined;
}

function schemeOf(affectation: CatalogEntry): TaxScheme {
  const entry = Affectation.all().find((candidate) => candidate.code === affectation.code);
  return entry?.taxScheme ?? { code: '1000', name: 'IGV', international: 'VAT' };
}

function isSupported(affectation: CatalogEntry): boolean {
  return [Affectation.Taxed, Affectation.Exempt, Affectation.Unaffected].some(
    (supported) => supported.code === affectation.code,
  );
}

interface ItemContext {
  readonly rate: Decimal;
  readonly rateFactor: Decimal;
  readonly currency: CatalogEntry;
  readonly rounding: RoundingValue;
  readonly defaults: CalculationSettings['defaults'];
}

function calculateItem(
  input: ItemInput,
  index: number,
  context: ItemContext,
  issues: Issue[],
): Item | undefined {
  const path = `items[${index}]`;
  const issuesBefore = issues.length;
  const hasPrice = input.price !== undefined;
  const hasValue = input.value !== undefined;
  if (hasPrice === hasValue) {
    issues.push(
      issue(
        path,
        'tribu',
        hasPrice
          ? 'An Item gives price (Unit Price, tax included) or value (Unit Value, tax excluded), never both.'
          : 'An Item needs price (Unit Price, tax included) or value (Unit Value, tax excluded).',
        'Pass exactly one of price or value.',
        'ADR 0001',
      ),
    );
    return undefined;
  }

  const supplied = input.price ?? input.value;
  if (supplied === undefined) return undefined;
  const amount = amountOf(supplied);
  const suppliedCurrency = currencyOf(supplied);
  if (suppliedCurrency !== undefined && suppliedCurrency.code !== context.currency.code) {
    issues.push(
      issue(
        `${path}.${hasPrice ? 'price' : 'value'}`,
        '2071',
        `The Item is in ${suppliedCurrency.code} but the document is in ${context.currency.code}.`,
        'Use the document currency for every amount.',
        'Reglas de validación · Factura2_0 (ERR 2071)',
      ),
    );
    return undefined;
  }

  const affectation = input.affectation ?? context.defaults.affectation;
  if (!isSupported(affectation)) {
    issues.push(
      issue(
        `${path}.affectation`,
        'tribu',
        `The Tax Affectation ${affectation.code} (${affectation.name}) is not supported in v0.1.`,
        'Use Affectation.Taxed, Affectation.Exempt or Affectation.Unaffected.',
        'docs/plan/v0.1-scope.md',
      ),
    );
    return undefined;
  }

  const quantity = Decimal.from(input.quantity);
  // v0.1 issues only onerous operations, so every amount of a line is positive (a free operation,
  // the only case with a zero Unit Value, is out of scope): factura-2.0.csv, ERR 2024, 2025, 2367, 2369.
  const amountPath = `${path}.${hasPrice ? 'price' : 'value'}`;
  const positive = quantity.compare(ZERO) > 0;
  if (!positive || !quantity.round(10).equals(quantity)) {
    issues.push(
      issue(
        `${path}.quantity`,
        quantity.equals(ZERO) ? '2024' : '2025',
        'The quantity must be greater than zero, with at most 10 decimals.',
        'Pass a quantity such as 1 or "0.5".',
        'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      ),
    );
  }
  if (amount.compare(ZERO) <= 0) {
    issues.push(
      issue(
        amountPath,
        hasPrice ? '2367' : '2369',
        `The ${hasPrice ? 'price' : 'value'} must be greater than zero.`,
        'Pass the amount the customer is charged per unit; a free item is not supported in v0.1.',
        'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      ),
    );
  }
  if (issues.length > issuesBefore) return undefined;
  const unit = input.unit ?? context.defaults.unit;
  const unitSource =
    input.unit !== undefined
      ? 'item'
      : context.defaults.unit.code === Unit.Goods.code
        ? 'default'
        : 'issuer';
  const affectationSource =
    input.affectation !== undefined
      ? 'item'
      : context.defaults.affectation.code === Affectation.Taxed.code
        ? 'default'
        : 'issuer';
  const taxed = affectation.code === Affectation.Taxed.code;

  let unitValue: Decimal;
  let unitPrice: Decimal;
  let value: Decimal;
  let igv: Decimal;
  let total: Decimal;

  if (hasPrice) {
    unitPrice = amount;
    unitValue = taxed ? amount.div(context.rateFactor) : amount;
    total = amount.times(quantity).round(2, context.rounding);
    value = taxed ? total.div(context.rateFactor).round(2, context.rounding) : total;
    igv = taxed ? total.minus(value) : ZERO;
  } else {
    unitValue = amount;
    unitPrice = taxed ? amount.times(context.rateFactor) : amount;
    value = amount.times(quantity).round(2, context.rounding);
    igv = taxed ? value.times(context.rate).div(HUNDRED).round(2, context.rounding) : ZERO;
    total = value.plus(igv);
  }

  // ERR 2370: the line's value of sale is positive too, so a price that rounds to 0.00 is rejected.
  if (value.compare(ZERO) <= 0) {
    issues.push(
      issue(
        amountPath,
        '2370',
        'The line value of sale rounds to 0.00.',
        'Raise the quantity or the amount so the line is worth at least 0.01.',
        'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      ),
    );
    return undefined;
  }

  return {
    description: input.description,
    quantity,
    unit,
    affectation,
    unitValue,
    unitPrice,
    value,
    igv,
    total,
    taxScheme: schemeOf(affectation),
    sources: { unit: unitSource, affectation: affectationSource },
    ...(input.classification === undefined ? {} : { classification: input.classification }),
  };
}

function calculateItems(
  inputs: readonly ItemInput[],
  context: ItemContext,
  issues: Issue[],
): Item[] {
  const items: Item[] = [];
  for (const [index, input] of inputs.entries()) {
    const item = calculateItem(input, index, context, issues);
    if (item !== undefined) items.push(item);
  }
  return items;
}

/** Rebuilds Decimal values from a Record restored with JSON.parse, which hands back strings. */
function rehydrateItem(item: Item): Item {
  return {
    ...item,
    quantity: Decimal.from(item.quantity),
    unitValue: Decimal.from(item.unitValue),
    unitPrice: Decimal.from(item.unitPrice),
    value: Decimal.from(item.value),
    igv: Decimal.from(item.igv),
    total: Decimal.from(item.total),
  };
}

function nonEmpty(items: readonly Item[]): readonly [Item, ...Item[]] {
  const [first, ...rest] = items;
  if (first === undefined) {
    throw new TribuError({
      kind: 'validation',
      issues: [
        issue(
          'items',
          'tribu',
          'A document needs at least one Item.',
          'Pass items.',
          'Reglas de validación',
        ),
      ],
    });
  }
  return [first, ...rest];
}

function sumTotals(items: readonly Item[]): Totals {
  let taxed = ZERO;
  let exempt = ZERO;
  let unaffected = ZERO;
  let igv = ZERO;
  let value = ZERO;
  for (const item of items) {
    value = value.plus(item.value);
    igv = igv.plus(item.igv);
    if (item.affectation.code === Affectation.Taxed.code) taxed = taxed.plus(item.value);
    else if (item.affectation.code === Affectation.Exempt.code) exempt = exempt.plus(item.value);
    else if (item.affectation.code === Affectation.Unaffected.code) {
      unaffected = unaffected.plus(item.value);
    }
  }
  return { taxed, exempt, unaffected, igv, value, payable: value.plus(igv) };
}

/** The amount still owed on credit: the total less the detracción the Customer deposits (ADR 0020). */
function paymentOf(input: DocumentInput['payment'], pending: Decimal): Payment {
  if (input === undefined) return { terms: 'cash' };
  const installments: Installment[] = input.installments.map((installment) => ({
    amount: amountOf(installment.amount),
    due: installment.due,
  }));
  return { terms: 'credit', pending, installments };
}

/**
 * Checks a detracción request before anything is calculated. Only Invoices in soles: a Receipt
 * rarely carries one, and a foreign-currency Invoice needs an exchange rate SUNAT leaves to the
 * Issuer (docs/research/detracciones-2026-10.md § 4, § 6, unconfirmed items 7).
 */
function checkDetraccion(
  type: CatalogEntry,
  input: DocumentInput,
  currency: CatalogEntry,
  account: string | undefined,
  issues: Issue[],
): void {
  const entry = input.detraccion;
  if (entry === undefined) return;
  const source = 'docs/research/detracciones-2026-10.md';
  if (type.code !== DocumentType.Invoice.code) {
    issues.push(
      issue(
        'detraccion',
        'tribu',
        `Tribu adds a detracción only to Invoices, not to a ${type.name}.`,
        'Remove detraccion, or issue an Invoice.',
        source,
      ),
    );
  }
  if (entry.catalog !== '54' || typeof entry.rate !== 'string') {
    issues.push(
      issue(
        'detraccion',
        '3033',
        'The detracción must be a constant of catalog 54.',
        'Use a Detraccion constant, such as Detraccion.Maintenance.',
        'ADR 0020',
      ),
    );
  }
  if (currency.code !== Currency.Pen.code) {
    issues.push(
      issue(
        'detraccion',
        'tribu',
        'Tribu adds a detracción only to Invoices in soles: in another currency it needs an exchange rate.',
        'Issue the Invoice in PEN.',
        source,
      ),
    );
  }
  if (account === undefined || account.trim().length === 0) {
    issues.push(
      issue(
        'detraccion',
        '3034',
        "The Invoice needs the Issuer's Banco de la Nación account for the detracción.",
        'Pass issuer.detraccionAccount to tribu.create.',
        'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      ),
    );
  }
}

function detraccionOf(
  entry: DetraccionEntry,
  payable: Decimal,
  account: string,
  rounding: RoundingValue,
): Detraccion {
  const rate = Decimal.from(entry.rate);
  const amount = payable.times(rate).div(HUNDRED).round(2, rounding);
  return { code: entry, rate, amount, account };
}

function identifyCustomer(input: CustomerInput, issues: Issue[]): IdentifiedCustomer | undefined {
  const name = input.name ?? '';
  if (input.ruc !== undefined) {
    try {
      return { identity: Identity.Ruc, number: Ruc.from(input.ruc), name };
    } catch (error) {
      const first = error instanceof TribuError ? error.issues[0] : undefined;
      issues.push({
        ...(first ??
          issue(
            'customer.ruc',
            '2010',
            'The customer RUC is not valid.',
            'Pass a valid RUC.',
            'SUNAT',
          )),
        path: 'customer.ruc',
      });
      return undefined;
    }
  }
  if (input.dni !== undefined) {
    try {
      return { identity: Identity.Dni, number: Dni.from(input.dni), name };
    } catch {
      issues.push(
        issue(
          'customer.dni',
          '2010',
          'The customer DNI is not valid.',
          'Pass the 8 digits.',
          'SUNAT',
        ),
      );
      return undefined;
    }
  }
  if (input.ce !== undefined) return { identity: Identity.ForeignerId, number: input.ce, name };
  if (input.passport !== undefined)
    return { identity: Identity.Passport, number: input.passport, name };
  if (input.id !== undefined) return { identity: input.id, number: input.number ?? '', name };
  issues.push(
    issue(
      'customer',
      '2800',
      'A customer needs an identity: ruc, dni, ce, passport or id.',
      'Pass one of them.',
      'Reglas de validación · Factura2_0 (ERR 2800)',
    ),
  );
  return undefined;
}

function seriesOf(
  type: CatalogEntry,
  explicit: string | undefined,
  modifies: string | undefined,
  series: SeriesConfig,
): string {
  if (explicit !== undefined) return explicit;
  if (type.code === DocumentType.Invoice.code) return series.invoice;
  if (type.code === DocumentType.Receipt.code) return series.receipt;
  const receiptNote = modifies?.startsWith('B') === true;
  if (type.code === DocumentType.CreditNote.code) {
    return receiptNote ? series.creditNote.receipt : series.creditNote.invoice;
  }
  return receiptNote ? series.debitNote.receipt : series.debitNote.invoice;
}

export function calculate(
  type: typeof DocumentType.Invoice,
  input: DocumentInput,
  settings: CalculationSettings,
): Invoice;
export function calculate(
  type: typeof DocumentType.Receipt,
  input: DocumentInput,
  settings: CalculationSettings,
): Receipt;
export function calculate(
  type: typeof DocumentType.CreditNote,
  input: DocumentInput,
  settings: CalculationSettings,
): CreditNote;
export function calculate(
  type: typeof DocumentType.DebitNote,
  input: DocumentInput,
  settings: CalculationSettings,
): DebitNote;
export function calculate(
  type: CatalogEntry,
  input: DocumentInput,
  settings: CalculationSettings,
): Document;
export function calculate(
  type: CatalogEntry,
  input: DocumentInput,
  settings: CalculationSettings,
): Document {
  const issues: Issue[] = [];
  const isNote =
    type.code === DocumentType.CreditNote.code || type.code === DocumentType.DebitNote.code;
  const isReceipt = type.code === DocumentType.Receipt.code;
  const affected = typeof input.modifies === 'string' ? undefined : input.modifies;
  const modifies = typeof input.modifies === 'string' ? input.modifies : input.modifies?.id;

  if (isNote && (modifies === undefined || modifies.length === 0)) {
    issues.push(
      issue(
        'modifies',
        'tribu',
        'A Note needs the document it modifies.',
        'Pass modifies: the Record or its Series-Number.',
        'Reglas de validación · NotaCredito2_0',
      ),
    );
  }

  if (isNote) {
    const expected = type.code === DocumentType.CreditNote.code ? '09' : '10';
    if (input.reason === undefined) {
      issues.push(
        issue(
          'reason',
          '2128',
          'A Note needs its Reason.',
          'Pass a Reason from its catalog.',
          'ADR 0011',
        ),
      );
    } else if (input.reason.catalog !== expected) {
      issues.push(
        issue(
          'reason',
          '2128',
          `A ${type.name} takes reasons from catalog ${expected}, not ${input.reason.catalog}.`,
          'Use the Reason constant of this document type (ADR 0005).',
          'ADR 0005',
        ),
      );
    }
  }

  const source = affected?.document;
  const currency = input.currency ?? source?.currency ?? Currency.Pen;
  checkDetraccion(type, input, currency, settings.issuer.detraccionAccount, issues);

  let customer: IdentifiedCustomer;
  if (input.customer !== undefined) {
    customer = identifyCustomer(input.customer, issues) ?? anonymousCustomer();
  } else if (source !== undefined) {
    customer = source.customer;
  } else if (isReceipt) {
    customer = anonymousCustomer();
  } else {
    issues.push(
      issue(
        'customer',
        '2800',
        'An Invoice and its Notes need an identified customer.',
        'Pass customer with a ruc, dni, ce or passport.',
        'Reglas de validación · Factura2_0 (ERR 2800)',
      ),
    );
    customer = anonymousCustomer();
  }

  if (input.number !== undefined && !isDocumentNumber(input.number)) {
    issues.push(badNumber('number', input.number));
  }

  const itemsInput = input.items;
  const issueDate = input.issueDate ?? settings.today;
  if (!isIsoDate(issueDate)) issues.push(badDate('issueDate', issueDate));
  for (const [index, installment] of (input.payment?.installments ?? []).entries()) {
    if (!isIsoDate(installment.due)) {
      issues.push(badDate(`payment.installments[${index}].due`, installment.due));
    }
  }
  // A bad date is already reported: use today's rate so it does not add a second, confusing error.
  const igvRate = Igv.rateOn(
    settings.issuer.igv ?? Igv.General,
    isIsoDate(issueDate) ? issueDate : settings.today,
  );
  const rateFactor = ONE.plus(igvRate.div(HUNDRED));
  let items: Item[];
  if (itemsInput !== undefined) {
    if (itemsInput.length === 0) {
      issues.push(
        issue(
          'items',
          'tribu',
          'A document needs at least one Item.',
          'Pass items.',
          'Reglas de validación',
        ),
      );
    }
    items = calculateItems(
      itemsInput,
      {
        rate: igvRate,
        rateFactor,
        currency,
        rounding: settings.rounding ?? Rounding.HalfUp,
        defaults: settings.defaults,
      },
      issues,
    );
  } else if (source !== undefined) {
    items = source.items.map((item) => rehydrateItem(item));
  } else {
    issues.push(
      issue(
        'items',
        'tribu',
        'A document needs at least one Item.',
        'Pass items.',
        'Reglas de validación',
      ),
    );
    items = [];
  }

  if (issues.length > 0) throw new TribuError({ kind: 'validation', issues });

  const totals = sumTotals(items);
  const rounding = settings.rounding ?? Rounding.HalfUp;
  const detraccion =
    input.detraccion === undefined
      ? undefined
      : detraccionOf(
          input.detraccion,
          totals.payable,
          settings.issuer.detraccionAccount ?? '',
          rounding,
        );
  const payment = paymentOf(
    input.payment,
    detraccion === undefined ? totals.payable : totals.payable.minus(detraccion.amount),
  );
  const series = seriesOf(type, input.series, modifies, settings.series ?? DEFAULT_SERIES);

  const document: Document = {
    type,
    series,
    issueDate,
    currency,
    customer,
    items: nonEmpty(items),
    totals,
    payment,
    igvRate,
    issuer: {
      ruc: settings.issuer.ruc,
      name: settings.issuer.name,
      ubigeo: settings.issuer.ubigeo,
    },
    ...(input.number === undefined ? {} : { number: input.number }),
    ...(detraccion === undefined ? {} : { detraccion }),
  };

  if (isNote) {
    return {
      ...document,
      modifies: modifies ?? '',
      reason: input.reason as CatalogEntry,
    };
  }
  return document;
}
