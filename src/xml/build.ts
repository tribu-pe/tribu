import { DocumentType } from '../catalogs/shared';
import type { Decimal } from '../documents/decimal';
import type { Document, Item, TaxScheme } from '../documents/document';
import { isAnonymous } from '../documents/predicates';
import { escapeXml } from './escape';

const NS = {
  Invoice: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  CreditNote: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
  DebitNote: 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
};

function attributes(values: Record<string, string | undefined>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${escapeXml(value as string)}"`)
    .join('');
}

function element(
  name: string,
  children: string | readonly string[],
  attributes_: Record<string, string | undefined> = {},
): string {
  const body = typeof children === 'string' ? children : children.join('');
  return `<${name}${attributes(attributes_)}>${body}</${name}>`;
}

function tag(
  name: string,
  value: string,
  attributes_?: Record<string, string | undefined>,
): string {
  return element(name, escapeXml(value), attributes_);
}

function money(currency: string, name: string, value: Decimal): string {
  return tag(name, value.toFixed(2), { currencyID: currency });
}

/**
 * How a Receipt names an Anonymous Customer. SUNAT prescribes no value, only 3 to 1500
 * characters (boleta-2.0.csv, ERR 2022): beta rejected "-" in Milestone 0.
 */
const ANONYMOUS_NAME = 'CLIENTES VARIOS';

/** The Issuer's main establishment; another code is checked against its RUC record. */
const MAIN_ESTABLISHMENT = '0000';

function party(identityCode: string, number: string, name: string, address?: string): string {
  return element('cac:Party', [
    element('cac:PartyIdentification', tag('cbc:ID', number, { schemeID: identityCode })),
    element('cac:PartyLegalEntity', [
      tag('cbc:RegistrationName', name),
      ...(address === undefined
        ? []
        : [element('cac:RegistrationAddress', tag('cbc:AddressTypeCode', address))]),
    ]),
  ]);
}

function paymentTerms(document: Document, currency: string): string[] {
  if (document.payment.terms === 'cash') {
    return [
      element('cac:PaymentTerms', [
        tag('cbc:ID', 'FormaPago'),
        tag('cbc:PaymentMeansID', 'Contado'),
      ]),
    ];
  }
  const terms = [
    element('cac:PaymentTerms', [
      tag('cbc:ID', 'FormaPago'),
      tag('cbc:PaymentMeansID', 'Credito'),
      money(currency, 'cbc:Amount', document.payment.pending),
    ]),
  ];
  document.payment.installments.forEach((installment, index) => {
    terms.push(
      element('cac:PaymentTerms', [
        tag('cbc:ID', 'FormaPago'),
        tag('cbc:PaymentMeansID', `Cuota${String(index + 1).padStart(3, '0')}`),
        money(currency, 'cbc:Amount', installment.amount),
        tag('cbc:PaymentDueDate', installment.due),
      ]),
    );
  });
  return terms;
}

function taxSchemeXml(scheme: TaxScheme): string {
  return element('cac:TaxScheme', [
    tag('cbc:ID', scheme.code),
    tag('cbc:Name', scheme.name),
    tag('cbc:TaxTypeCode', scheme.international),
  ]);
}

function taxSubtotal(currency: string, scheme: TaxScheme, taxable: Decimal, tax: Decimal): string {
  return element('cac:TaxSubtotal', [
    money(currency, 'cbc:TaxableAmount', taxable),
    money(currency, 'cbc:TaxAmount', tax),
    element('cac:TaxCategory', taxSchemeXml(scheme)),
  ]);
}

function itemCategory(item: Item, rate: string): string {
  // UBL 2.1 TaxCategoryType order: Percent before TaxExemptionReasonCode (beta answered 0306).
  return element('cac:TaxCategory', [
    tag('cbc:Percent', rate),
    tag('cbc:TaxExemptionReasonCode', item.affectation.code),
    taxSchemeXml(item.taxScheme),
  ]);
}

function line(
  item: Item,
  index: number,
  currency: string,
  rate: string,
  quantityName: string,
  lineName: string,
): string {
  return element(lineName, [
    tag('cbc:ID', String(index + 1)),
    tag(quantityName, item.quantity.toString(), { unitCode: item.unit.code }),
    money(currency, 'cbc:LineExtensionAmount', item.value),
    element('cac:PricingReference', [
      element('cac:AlternativeConditionPrice', [
        money(currency, 'cbc:PriceAmount', item.unitPrice),
        tag('cbc:PriceTypeCode', '01'),
      ]),
    ]),
    element('cac:TaxTotal', [
      money(currency, 'cbc:TaxAmount', item.igv),
      element('cac:TaxSubtotal', [
        money(currency, 'cbc:TaxableAmount', item.value),
        money(currency, 'cbc:TaxAmount', item.igv),
        itemCategory(item, rate),
      ]),
    ]),
    element('cac:Item', tag('cbc:Description', item.description)),
    element(
      'cac:Price',
      tag('cbc:PriceAmount', item.unitValue.toFixed(10), { currencyID: currency }),
    ),
  ]);
}

function totals(document: Document, currency: string, monetaryTotal: string): string[] {
  const schemes = new Map<string, { scheme: TaxScheme; taxable: Decimal; tax: Decimal }>();
  for (const item of document.items) {
    const current = schemes.get(item.taxScheme.code);
    if (current === undefined) {
      schemes.set(item.taxScheme.code, {
        scheme: item.taxScheme,
        taxable: item.value,
        tax: item.igv,
      });
    } else {
      current.taxable = current.taxable.plus(item.value);
      current.tax = current.tax.plus(item.igv);
    }
  }
  return [
    element('cac:TaxTotal', [
      money(currency, 'cbc:TaxAmount', document.totals.igv),
      ...[...schemes.values()].map(({ scheme, taxable, tax }) =>
        taxSubtotal(currency, scheme, taxable, tax),
      ),
    ]),
    element(monetaryTotal, [
      money(currency, 'cbc:LineExtensionAmount', document.totals.value),
      money(currency, 'cbc:TaxInclusiveAmount', document.totals.payable),
      money(currency, 'cbc:PayableAmount', document.totals.payable),
    ]),
  ];
}

function parties(document: Document): string[] {
  const supplier = element(
    'cac:AccountingSupplierParty',
    // factura-2.0.csv: the establishment code is mandatory (ERR 3030).
    party('6', document.issuer.ruc.value, document.issuer.name, MAIN_ESTABLISHMENT),
  );
  const customer = isAnonymous(document.customer)
    ? element('cac:AccountingCustomerParty', party('-', '-', ANONYMOUS_NAME))
    : element(
        'cac:AccountingCustomerParty',
        party(
          document.customer.identity.code,
          String(document.customer.number),
          document.customer.name,
        ),
      );
  return [supplier, customer];
}

/** The Id of ds:Signature (ERR 2085), referenced from cac:Signature. */
export const SIGNATURE_ID = 'SignTribu';

/** firma.csv: cbc:ID (ERR 2076), the issuer RUC (ERR 2078), its name (ERR 2081), the URI (ERR 2083). */
function signatureBlock(document: Document): string {
  return element('cac:Signature', [
    tag('cbc:ID', SIGNATURE_ID),
    element('cac:SignatoryParty', [
      element('cac:PartyIdentification', tag('cbc:ID', document.issuer.ruc.value)),
      element('cac:PartyName', tag('cbc:Name', document.issuer.name)),
    ]),
    element(
      'cac:DigitalSignatureAttachment',
      element('cac:ExternalReference', tag('cbc:URI', `#${SIGNATURE_ID}`)),
    ),
  ]);
}

function extensions(): string {
  return element(
    'ext:UBLExtensions',
    element('ext:UBLExtension', element('ext:ExtensionContent', '')),
  );
}

function idOf(document: Document, number: number): string {
  return `${document.series}-${number}`;
}

function invoiceXml(document: Document, number: number): string {
  const currency = document.currency.code;
  const rate = document.igvRate.toFixed(2);
  const lines = document.items.map((item, index) =>
    line(item, index, currency, rate, 'cbc:InvoicedQuantity', 'cac:InvoiceLine'),
  );
  return element(
    'Invoice',
    [
      extensions(),
      tag('cbc:UBLVersionID', '2.1'),
      tag('cbc:CustomizationID', '2.0'),
      tag('cbc:ID', idOf(document, number)),
      tag('cbc:IssueDate', document.issueDate),
      tag('cbc:InvoiceTypeCode', document.type.code, { listID: '0101' }),
      tag('cbc:DocumentCurrencyCode', currency),
      signatureBlock(document),
      ...parties(document),
      ...paymentTerms(document, currency),
      ...totals(document, currency, 'cac:LegalMonetaryTotal'),
      ...lines,
    ],
    {
      xmlns: NS.Invoice,
      'xmlns:cac': NS.cac,
      'xmlns:cbc': NS.cbc,
      'xmlns:ext': NS.ext,
      'xmlns:ds': NS.ds,
    },
  );
}

function noteXml(document: Document, number: number): string {
  const isCredit = document.type.code === DocumentType.CreditNote.code;
  const root = isCredit ? 'CreditNote' : 'DebitNote';
  const currency = document.currency.code;
  const rate = document.igvRate.toFixed(2);
  const modifies = 'modifies' in document ? document.modifies : '';
  const affectedType = modifies.startsWith('B') ? '03' : '01';
  const reason = 'reason' in document ? document.reason : undefined;
  return element(
    root,
    [
      extensions(),
      tag('cbc:UBLVersionID', '2.1'),
      tag('cbc:CustomizationID', '2.0'),
      tag('cbc:ID', idOf(document, number)),
      tag('cbc:IssueDate', document.issueDate),
      tag('cbc:DocumentCurrencyCode', currency),
      element('cac:DiscrepancyResponse', [
        tag('cbc:ReferenceID', modifies),
        tag('cbc:ResponseCode', reason?.code ?? ''),
        tag('cbc:Description', reason?.name ?? ''),
      ]),
      element(
        'cac:BillingReference',
        element('cac:InvoiceDocumentReference', [
          tag('cbc:ID', modifies),
          tag('cbc:DocumentTypeCode', affectedType),
        ]),
      ),
      signatureBlock(document),
      ...parties(document),
      // nota-credito-2.0.csv: PaymentTerms only for Reason 13, and only "Credito" (ERR 3257);
      // beta rejected "Contado" on a note (ERR 3246). nota-debito-2.0.csv has no PaymentTerms.
      ...totals(
        document,
        currency,
        isCredit ? 'cac:LegalMonetaryTotal' : 'cac:RequestedMonetaryTotal',
      ),
      ...document.items.map((item, index) =>
        line(
          item,
          index,
          currency,
          rate,
          isCredit ? 'cbc:CreditedQuantity' : 'cbc:DebitedQuantity',
          isCredit ? 'cac:CreditNoteLine' : 'cac:DebitNoteLine',
        ),
      ),
    ],
    {
      xmlns: isCredit ? NS.CreditNote : NS.DebitNote,
      'xmlns:cac': NS.cac,
      'xmlns:cbc': NS.cbc,
      'xmlns:ext': NS.ext,
      'xmlns:ds': NS.ds,
    },
  );
}

/** Document → UBL XML. Typed functions per part: escaping happens by construction (ADR 0004). */
export function build(document: Document): string {
  const number = document.number;
  if (number === undefined) {
    throw new Error(
      'build() needs the Number: calculate leaves it undefined until it is reserved.',
    );
  }
  return document.type.code === DocumentType.Invoice.code ||
    document.type.code === DocumentType.Receipt.code
    ? invoiceXml(document, number)
    : noteXml(document, number);
}
