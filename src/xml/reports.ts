import { Decimal } from '../documents/decimal';
import type { Document, Issuer } from '../documents/document';
import { isAnonymous } from '../documents/predicates';

const SUMMARY_NS = 'urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1';
const VOIDED_NS = 'urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1';
// The sac namespace SUNAT's own CDRs declare (Milestone 0).
const SAC = 'urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1';
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const EXT = 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function element(name: string, children: string | readonly string[], attributes = ''): string {
  const body = typeof children === 'string' ? children : children.join('');
  return `<${name}${attributes}>${body}</${name}>`;
}

function namespaces(root: string, sac: string): string {
  return ` xmlns="${root}" xmlns:cac="${CAC}" xmlns:cbc="${CBC}" xmlns:ext="${EXT}" xmlns:sac="${sac}"`;
}

function extensions(): string {
  return '<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>';
}

function money(name: string, currency: string, value: Decimal): string {
  return `<${name} currencyID="${escapeXml(currency)}">${value.toFixed(2)}</${name}>`;
}

/** The reports' older issuer format: RUC (ERR 1034), type 6 (ERR 2218) and name. */
function supplier(issuer: Issuer): string {
  return element('cac:AccountingSupplierParty', [
    tag('cbc:CustomerAssignedAccountID', issuer.ruc.value),
    tag('cbc:AdditionalAccountID', '6'),
    element('cac:Party', element('cac:PartyLegalEntity', tag('cbc:RegistrationName', issuer.name))),
  ]);
}

const ZERO = Decimal.from(0);

/** resumen-diario-1.1.csv: value of sale per catalog 11 code, only when there is one. */
function payments(document: Document, currency: string): string[] {
  const { taxed, exempt, unaffected } = document.totals;
  return (
    [
      ['01', taxed],
      ['02', exempt],
      ['03', unaffected],
    ] as const
  )
    .filter(([, amount]) => !amount.equals(ZERO))
    .map(([code, amount]) =>
      element('sac:BillingPayment', [
        money('cbc:PaidAmount', currency, amount),
        tag('cbc:InstructionID', code),
      ]),
    );
}

function summaryLine(line: SummaryLine, index: number): string {
  const { document } = line;
  const currency = document.currency.code;
  const customer = isAnonymous(document.customer)
    ? []
    : [
        element('cac:AccountingCustomerParty', [
          tag('cbc:CustomerAssignedAccountID', String(document.customer.number)),
          tag('cbc:AdditionalAccountID', document.customer.identity.code),
        ]),
      ];
  const igv = money('cbc:TaxAmount', currency, document.totals.igv);
  return element('sac:SummaryDocumentsLine', [
    tag('cbc:LineID', String(index + 1)),
    tag('cbc:DocumentTypeCode', document.type.code),
    tag('cbc:ID', `${document.series}-${document.number ?? ''}`),
    ...customer,
    element('cac:Status', tag('cbc:ConditionCode', line.condition)),
    money('sac:TotalAmount', currency, document.totals.payable),
    ...payments(document, currency),
    element('cac:TaxTotal', [
      igv,
      element('cac:TaxSubtotal', [
        igv,
        // ERR 2992: the rate is required for IGV (10.5 or 18 on a Receipt, ERR 3504).
        element('cac:TaxCategory', [
          tag('cbc:Percent', document.igvRate.toFixed(2)),
          element('cac:TaxScheme', [
            tag('cbc:ID', '1000'),
            tag('cbc:Name', 'IGV'),
            tag('cbc:TaxTypeCode', 'VAT'),
          ]),
        ]),
      ]),
    ]),
  ]);
}

export interface SummaryLine {
  readonly document: Document;
  /** Catalog 19: 1 Adicionar, 3 Anulado. */
  readonly condition: '1' | '3';
}

export interface SummaryInput {
  readonly id: string;
  readonly referenceDate: string;
  readonly issueDate: string;
  readonly issuer: Issuer;
  readonly lines: readonly SummaryLine[];
}

/** The Daily Summary (resumen diario) of Receipts. */
export function buildSummary(input: SummaryInput): string {
  return element(
    'SummaryDocuments',
    [
      extensions(),
      // resumen-diario-1.1.csv: UBL 2.0 (ERR 2074), structure 1.1 (ERR 2072).
      tag('cbc:UBLVersionID', '2.0'),
      tag('cbc:CustomizationID', '1.1'),
      tag('cbc:ID', input.id),
      tag('cbc:ReferenceDate', input.referenceDate),
      tag('cbc:IssueDate', input.issueDate),
      supplier(input.issuer),
      ...input.lines.map(summaryLine),
    ],
    namespaces(SUMMARY_NS, SAC),
  );
}

export interface VoidedInput {
  readonly id: string;
  readonly referenceDate: string;
  readonly issueDate: string;
  readonly issuer: Issuer;
  readonly reason: string;
  readonly lines: readonly Document[];
}

/** The Voided Documents communication (comunicación de baja). */
export function buildVoidedDocuments(input: VoidedInput): string {
  const lines = input.lines.map((document, index) =>
    element('sac:VoidedDocumentsLine', [
      tag('cbc:LineID', String(index + 1)),
      tag('cbc:DocumentTypeCode', document.type.code),
      tag('sac:DocumentSerialID', document.series),
      tag('sac:DocumentNumberID', String(document.number ?? '')),
      tag('sac:VoidReasonDescription', input.reason),
    ]),
  );
  return element(
    'VoidedDocuments',
    [
      extensions(),
      // comunicacion-de-baja-1.0.csv: UBL 2.0 (ERR 2074), structure 1.0 (ERR 2072).
      tag('cbc:UBLVersionID', '2.0'),
      tag('cbc:CustomizationID', '1.0'),
      tag('cbc:ID', input.id),
      tag('cbc:ReferenceDate', input.referenceDate),
      tag('cbc:IssueDate', input.issueDate),
      supplier(input.issuer),
      ...lines,
    ],
    namespaces(VOIDED_NS, SAC),
  );
}
