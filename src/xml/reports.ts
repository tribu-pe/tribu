import type { Document, Issuer } from '../documents/document';

const SUMMARY_NS = 'urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1';
const VOIDED_NS = 'urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1';
const SAC = 'urn:sunat:names:specification:ubl:peru:schema:xsd:CommonAggregateComponents-2';
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

function supplier(issuer: Issuer): string {
  return element('cac:AccountingSupplierParty', [
    element('cac:Party', [
      element('cac:PartyIdentification', tag('cbc:ID', issuer.ruc.value)),
      element('cac:PartyLegalEntity', tag('cbc:RegistrationName', issuer.name)),
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
  const lines = input.lines.map((line, index) =>
    element('sac:SummaryDocumentsLine', [
      tag('cbc:LineID', String(index + 1)),
      tag('cbc:DocumentTypeCode', '03'),
      tag('cbc:ID', `${line.document.series}-${line.document.number ?? ''}`),
      element('cac:Status', tag('cbc:ConditionCode', line.condition)),
      tag('cbc:TotalAmount', line.document.totals.payable.toFixed(2)),
    ]),
  );
  return element(
    'SummaryDocuments',
    [
      tag('cbc:UBLVersionID', '1.1'),
      tag('cbc:CustomizationID', '1.1'),
      tag('cbc:ID', input.id),
      tag('cbc:ReferenceDate', input.referenceDate),
      tag('cbc:IssueDate', input.issueDate),
      extensions(),
      supplier(input.issuer),
      ...lines,
    ],
    namespaces(SUMMARY_NS, SUMMARY_NS),
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
      tag('cbc:UBLVersionID', '1.0'),
      tag('cbc:CustomizationID', '1.0'),
      tag('cbc:ID', input.id),
      tag('cbc:ReferenceDate', input.referenceDate),
      tag('cbc:IssueDate', input.issueDate),
      extensions(),
      supplier(input.issuer),
      ...lines,
    ],
    namespaces(VOIDED_NS, SAC),
  );
}
