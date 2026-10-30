import { createHash } from 'node:crypto';
import type { CatalogEntry } from './catalogs/catalog';
import type { Reason as CreditReason } from './catalogs/documents/credit-note';
import type { Reason as DebitReason } from './catalogs/documents/debit-note';
import type { IgvRegime } from './catalogs/igv';
import {
  Affectation,
  DocumentType,
  type DocumentTypeEntry,
  TicketStatus,
  Unit,
} from './catalogs/shared';
import {
  type CalculationSettings,
  calculate,
  type DocumentInput,
  type RecordLike,
  type SeriesConfig,
} from './documents/calculate';
import type { Document } from './documents/document';
import { qrText } from './documents/qr';
import type { Ruc } from './documents/ruc';
import type { RecoveryValue, RoundingValue, SignatureValue } from './options';
import type { LifecycleState } from './results/lifecycle';
import type {
  Cdr,
  DocumentRecord,
  IssueResult,
  MemberRecord,
  SubmissionRecord,
  TribuRecord,
} from './results/record';
import { Status } from './results/status';
import type { ErrorKind, ErrorRecord, Issue } from './results/tribu-error';
import { TribuError } from './results/tribu-error';
import { defaultRules } from './rules/registry';
import { validate } from './rules/validate';
import { deadline as voidedDocumentsDeadline } from './rules/voided-documents/deadline';
import type { OpenCertificate } from './signing/certificate';
import { sign } from './signing/sign';
import {
  dailySummaryFileName,
  documentFileName,
  voidedDocumentsFileName,
} from './transport/file-name';
import {
  type CdrLookup,
  type StatusAnswer,
  type Submission,
  type SunatTransport,
  TransportFailure,
} from './transport/send';
import { zipDocument } from './transport/zip';
import { build } from './xml/build';
import { buildSummary, buildVoidedDocuments } from './xml/reports';

export interface CallOptions {
  readonly throw?: boolean;
  readonly validate?: 'warn' | false;
  readonly send?: boolean;
  readonly retry?: { readonly attempts: number };
  readonly recovery?: RecoveryValue;
}

export type DocumentKind = 'invoice' | 'receipt' | 'creditNote' | 'debitNote';

type CreditReasonEntry =
  | typeof CreditReason.Void
  | typeof CreditReason.WrongRuc
  | typeof CreditReason.FixDescription
  | typeof CreditReason.Global.Discount
  | typeof CreditReason.Item.Discount
  | typeof CreditReason.Item.Return
  | typeof CreditReason.Total.Return
  | typeof CreditReason.Bonus
  | typeof CreditReason.ValueDecrease
  | typeof CreditReason.Other;

type DebitReasonEntry =
  | typeof DebitReason.Interest
  | typeof DebitReason.ValueIncrease
  | typeof DebitReason.Penalty;

export type CreditNoteIssueInput = Omit<DocumentInput, 'reason'> & {
  readonly reason: CreditReasonEntry;
  readonly modifies: string | RecordLike;
};

export type DebitNoteIssueInput = Omit<DocumentInput, 'reason'> & {
  readonly reason: DebitReasonEntry;
  readonly modifies: string | RecordLike;
};

export interface ClientContext {
  readonly env: 'beta' | 'production';
  readonly issuer: {
    readonly ruc: Ruc;
    readonly name: string;
    readonly ubigeo: string;
    readonly igv: IgvRegime;
  };
  readonly sol: { readonly user: string; readonly password: string };
  readonly certificate: OpenCertificate;
  readonly transport: SunatTransport;
  readonly series: SeriesConfig;
  readonly rounding: RoundingValue;
  readonly signature: SignatureValue;
  readonly recovery: Record<DocumentKind, RecoveryValue>;
  readonly timeout: number;
  readonly retry: {
    readonly attempts: number;
    readonly delay: number | ((attempt: number) => number);
  };
  readonly nextNumber?: (series: string) => Promise<number>;
  readonly rules: { readonly disable: readonly string[] };
}

/** Today in Lima (UTC-5), as YYYY-MM-DD; never the server clock. */
export function limaToday(): string {
  return new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
}

function settingsOf(context: ClientContext): CalculationSettings {
  return {
    issuer: {
      ruc: context.issuer.ruc,
      name: context.issuer.name,
      ubigeo: context.issuer.ubigeo,
      igv: context.issuer.igv,
    },
    defaults: { unit: Unit.Goods, affectation: Affectation.Taxed },
    rounding: context.rounding,
    today: limaToday(),
    series: context.series,
  };
}

function issue(path: string, code: string, why: string, fix: string, source: string): Issue {
  return { code, path, why, fix, source };
}

function validation(issues: readonly Issue[]): TribuError {
  return new TribuError({ kind: 'validation', issues });
}

function configIssue(why: string, fix: string): TribuError {
  return new TribuError({
    kind: 'config',
    issues: [issue('record', 'record', why, fix, 'ADR 0008')],
  });
}

function kindOf(type: { readonly code: string }): DocumentKind {
  if (type.code === DocumentType.Invoice.code) return 'invoice';
  if (type.code === DocumentType.Receipt.code) return 'receipt';
  if (type.code === DocumentType.CreditNote.code) return 'creditNote';
  return 'debitNote';
}

function checkedRules(
  context: ClientContext,
  document: Document,
  channel: 'individual' | 'summary' | 'voiding',
  affected?: RecordLike,
  rules = defaultRules,
) {
  return validate(document, rules, {
    today: limaToday(),
    disable: context.rules.disable,
    channel,
    ...(affected === undefined ? {} : { affected }),
  });
}

async function reserveNumber(context: ClientContext, series: string): Promise<number> {
  if (context.nextNumber !== undefined) return context.nextNumber(series);
  throw validation([
    issue(
      'number',
      'number',
      'The document has no Number, and no way to reserve one was configured.',
      'Pass number, or configure nextNumber.',
      'ADR 0003',
    ),
  ]);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function delayFor(delay: number | ((attempt: number) => number), attempt: number): number {
  return typeof delay === 'function' ? delay(attempt) : delay * 2 ** (attempt - 1);
}

/** An unknown error may have happened after SUNAT got the file: assume it did (ADR 0015). */
function toFailure(error: unknown): TransportFailure {
  if (error instanceof TransportFailure) return error;
  return new TransportFailure(error instanceof Error ? error.message : String(error), {
    sent: true,
  });
}

async function submitOnce(context: ClientContext, submission: Submission): Promise<Cdr> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<Cdr>((resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new TransportFailure(`SUNAT did not answer within ${context.timeout} ms`, { sent: true }),
        );
      }, context.timeout);
      context.transport.sendBill(submission).then(resolve, reject);
    });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

interface Outcome {
  readonly status: LifecycleState;
  readonly cdr?: Cdr;
  readonly kind?: ErrorKind;
  readonly issues?: readonly Issue[];
}

function outcomeOf(cdr: Cdr): Outcome {
  const status = Status.fromResponse(cdr.code) ?? Status.Issued;
  if (status === Status.Rejected) {
    return {
      status,
      cdr,
      kind: 'rejected',
      issues: [
        issue(
          'cdr',
          cdr.code,
          cdr.description === '' ? `SUNAT rejected the document (${cdr.code}).` : cdr.description,
          'Correct the document and issue a new one.',
          'SUNAT CDR',
        ),
      ],
    };
  }
  return { status, cdr };
}

/**
 * A SOAP fault carries a return code like a CDR does, and its class decides (ADR 0014): beta
 * rejects content (2000–3999) by fault too. Only exceptions (0100–1999) leave the Record Issued.
 */
function faultOutcome(code: string, message: string): Outcome {
  if (Status.fromResponse(code) === Status.Rejected) {
    return {
      status: Status.Rejected,
      kind: 'rejected',
      issues: [
        issue(
          'cdr',
          code,
          message,
          'Correct the document and issue a new one, with a new Number.',
          'ADR 0014',
        ),
      ],
    };
  }
  return {
    status: Status.Issued,
    kind: 'exception',
    issues: [
      issue(
        'cdr',
        code,
        message,
        'SUNAT did not evaluate the document; the Record stays Issued.',
        'ADR 0014',
      ),
    ],
  };
}

function unconfirmed(kind: DocumentKind, failure: TransportFailure): Outcome {
  const receipt = kind === 'receipt';
  return {
    status: Status.Unconfirmed,
    kind: 'unconfirmed',
    issues: [
      issue(
        'cdr',
        'unconfirmed',
        `The answer was lost after sending (${failure.message}).`,
        receipt
          ? 'Retry with Recovery.Resend or include the Receipt in a dailySummary.'
          : 'Retry with sunat.retry(record) or Recovery.Resend.',
        'ADR 0015',
      ),
    ],
  };
}

async function resend(
  context: ClientContext,
  submission: Submission,
  kind: DocumentKind,
): Promise<Outcome> {
  try {
    return outcomeOf(await submitOnce(context, submission));
  } catch (error) {
    const failure = toFailure(error);
    if (failure.code !== undefined) return faultOutcome(failure.code, failure.message);
    return unconfirmed(kind, failure);
  }
}

async function recover(
  context: ClientContext,
  kind: DocumentKind,
  submission: Submission,
  failure: TransportFailure,
  recovery: RecoveryValue,
  lookup: CdrLookup,
): Promise<Outcome> {
  const canLookUp = kind !== 'receipt' && context.transport.getStatusCdr !== undefined;
  if (context.env === 'production' && canLookUp && context.transport.getStatusCdr !== undefined) {
    let cdr: Cdr | undefined;
    try {
      cdr = await context.transport.getStatusCdr(lookup);
    } catch {
      // The lookup itself failed: the answer is still unknown, never a raw error without the Record.
      return recovery.strategy === 'resend'
        ? resend(context, submission, kind)
        : unconfirmed(kind, failure);
    }
    if (cdr !== undefined) return outcomeOf(cdr);
    return resend(context, submission, kind);
  }
  if (recovery.strategy === 'resend') return resend(context, submission, kind);
  return unconfirmed(kind, failure);
}

async function deliver(
  context: ClientContext,
  kind: DocumentKind,
  submission: Submission,
  call: CallOptions,
  lookup: CdrLookup,
): Promise<Outcome> {
  const attempts = Math.max(1, call.retry?.attempts ?? context.retry.attempts);
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return outcomeOf(await submitOnce(context, submission));
    } catch (error) {
      const failure = toFailure(error);
      if (failure.code !== undefined) return faultOutcome(failure.code, failure.message);
      if (!failure.sent) {
        if (attempt < attempts) {
          await sleep(delayFor(context.retry.delay, attempt));
          continue;
        }
        return {
          status: Status.Issued,
          kind: 'exception',
          issues: [
            issue(
              'transport',
              'transport',
              `The document never reached SUNAT after ${attempt} attempts.`,
              'Check the connection and send it again; the Number is still free.',
              'ADR 0015',
            ),
          ],
        };
      }
      return recover(
        context,
        kind,
        submission,
        failure,
        call.recovery ?? context.recovery[kind],
        lookup,
      );
    }
  }
}

function recordOf(
  document: Document & { readonly number: number },
  xml: string,
): Omit<DocumentRecord, 'status'> {
  return {
    id: `${document.series}-${document.number}`,
    document,
    xml,
    qr: qrText(document),
    hash: createHash('sha256').update(xml).digest('hex'),
  };
}

async function issueDocument(
  context: ClientContext,
  kind: DocumentKind,
  type: CatalogEntry,
  input: DocumentInput,
  call: CallOptions,
): Promise<IssueResult<DocumentRecord>> {
  const document = calculate(type, input, settingsOf(context));
  const affected = typeof input.modifies === 'string' ? undefined : input.modifies;
  const checked = checkedRules(context, document, 'individual', affected);
  const warnings: Issue[] =
    call.validate === 'warn' ? [...checked.errors, ...checked.warnings] : [...checked.warnings];
  if (call.validate !== false && call.validate !== 'warn' && checked.errors.length > 0) {
    throw validation(checked.errors);
  }

  const number = input.number ?? (await reserveNumber(context, document.series));
  const numbered: Document & { readonly number: number } = { ...document, number };
  const signed = sign(build(numbered), context.certificate, { signature: context.signature });
  const record = recordOf(numbered, signed);

  if (call.send === false) {
    return { record: { ...record, status: Status.Issued }, warnings };
  }

  const fileName = documentFileName(context.issuer.ruc.value, numbered);
  const submission: Submission = {
    fileName,
    zip: zipDocument(fileName, signed),
    username: `${context.issuer.ruc.value}${context.sol.user}`,
  };
  const lookup: CdrLookup = {
    ruc: context.issuer.ruc.value,
    documentType: numbered.type.code,
    series: numbered.series,
    number,
  };
  const outcome = await deliver(context, kind, submission, call, lookup);
  const finished: DocumentRecord = {
    ...record,
    status: outcome.status,
    ...(outcome.cdr === undefined ? {} : { cdr: outcome.cdr }),
  };
  if (outcome.kind !== undefined) {
    const error = new TribuError({
      kind: outcome.kind,
      issues: outcome.issues ?? [],
      record: finished,
    });
    if (call.throw !== false) throw error;
    return { record: finished, error, warnings };
  }
  return { record: finished, warnings };
}

export function issueInvoice(
  context: ClientContext,
  input: DocumentInput,
  call: CallOptions = {},
): Promise<IssueResult<DocumentRecord>> {
  return issueDocument(context, 'invoice', DocumentType.Invoice, input, call);
}

export function issueReceipt(
  context: ClientContext,
  input: DocumentInput,
  call: CallOptions = {},
): Promise<IssueResult<DocumentRecord>> {
  return issueDocument(context, 'receipt', DocumentType.Receipt, input, call);
}

export function issueCreditNote(
  context: ClientContext,
  input: CreditNoteIssueInput,
  call: CallOptions = {},
): Promise<IssueResult<DocumentRecord>> {
  return issueDocument(context, 'creditNote', DocumentType.CreditNote, input, call);
}

export function issueDebitNote(
  context: ClientContext,
  input: DebitNoteIssueInput,
  call: CallOptions = {},
): Promise<IssueResult<DocumentRecord>> {
  return issueDocument(context, 'debitNote', DocumentType.DebitNote, input, call);
}

export function preview(
  context: ClientContext,
  input: DocumentInput,
  type: DocumentTypeEntry = DocumentType.Invoice,
): Document {
  return calculate(type, input, settingsOf(context));
}

export async function validateOnly(
  context: ClientContext,
  input: DocumentInput,
  type: DocumentTypeEntry = DocumentType.Invoice,
): Promise<void> {
  const document = calculate(type, input, settingsOf(context));
  const checked = checkedRules(context, document, 'individual');
  if (checked.errors.length > 0) throw validation(checked.errors);
}

export interface DailySummaryInput {
  readonly date: string;
  readonly issued?: readonly TribuRecord[];
  readonly voided?: readonly TribuRecord[];
  readonly number: number;
  readonly onTicket?: (ticket: string) => void;
}

function memberOf(record: TribuRecord, condition?: '1' | '3'): MemberRecord {
  if (record.document === undefined)
    throw configIssue('The Record has no document.', 'Pass a Record issued by Tribu.');
  return {
    id: record.id,
    status: record.status ?? Status.Issued,
    document: record.document,
    ...(condition === undefined ? {} : { condition }),
  };
}

function transportIssue(message: string): Issue {
  return issue(
    'transport',
    'transport',
    message,
    'Check the connection and send the same file again.',
    'ADR 0015',
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function dailySummary(
  context: ClientContext,
  input: DailySummaryInput,
): Promise<IssueResult<SubmissionRecord>> {
  const issued = (input.issued ?? []).map((record) => memberOf(record, '1'));
  const voided = (input.voided ?? []).map((record) => memberOf(record, '3'));
  const warnings: Issue[] = [];
  const errors: Issue[] = [];
  for (const member of [...issued, ...voided]) {
    const checked = checkedRules(context, member.document, 'summary');
    warnings.push(...checked.warnings);
    errors.push(...checked.errors);
  }
  if (errors.length > 0) throw validation(errors);

  // ERR 2346: the id and the file name carry the generation date, which is cbc:IssueDate.
  const generatedOn = limaToday();
  const id = `RC-${generatedOn.replaceAll('-', '')}-${input.number}`;
  const xml = buildSummary({
    id,
    referenceDate: input.date,
    issueDate: generatedOn,
    issuer: context.issuer,
    lines: [
      ...issued.map((member) => ({ document: member.document, condition: '1' as const })),
      ...voided.map((member) => ({ document: member.document, condition: '3' as const })),
    ],
  });
  const signed = sign(xml, context.certificate, { signature: context.signature });
  const fileName = dailySummaryFileName(context.issuer.ruc.value, generatedOn, input.number);
  const record: SubmissionRecord = {
    id,
    status: Status.Processing,
    xml: signed,
    members: [...issued, ...voided],
  };
  let ticket: string;
  try {
    ticket = (
      await context.transport.sendSummary({
        fileName,
        zip: zipDocument(fileName, signed),
        username: `${context.issuer.ruc.value}${context.sol.user}`,
      })
    ).ticket;
  } catch (error) {
    throw new TribuError({
      kind: 'unconfirmed',
      issues: [transportIssue(errorMessage(error))],
      record: { ...record, status: Status.Unconfirmed },
    });
  }
  input.onTicket?.(ticket);
  return { record: { ...record, ticket }, warnings };
}

export interface VoidDocumentsInput {
  readonly documents: readonly TribuRecord[];
  readonly reason: string;
  readonly number: number;
}

export async function voidDocuments(
  context: ClientContext,
  input: VoidDocumentsInput,
): Promise<IssueResult<SubmissionRecord>[]> {
  const members = input.documents.map((record) => memberOf(record));
  for (const member of members) {
    if (member.document.type.code === DocumentType.Receipt.code) {
      throw validation([
        issue(
          'documents',
          'dailySummary',
          'A Receipt is voided in the dailySummary, not with voidDocuments.',
          'Pass receipts as voided to sunat.dailySummary(...).',
          'ADR 0010',
        ),
      ]);
    }
  }
  const errors: Issue[] = [];
  for (const member of members) {
    errors.push(
      ...checkedRules(context, member.document, 'voiding', undefined, [voidedDocumentsDeadline])
        .errors,
    );
  }
  if (errors.length > 0) throw validation(errors);

  const groups = new Map<string, MemberRecord[]>();
  for (const member of members) {
    const date = member.document.issueDate;
    groups.set(date, [...(groups.get(date) ?? []), member]);
  }

  const results: IssueResult<SubmissionRecord>[] = [];
  const generatedOn = limaToday();
  let offset = 0;
  for (const [date, group] of groups) {
    const number = input.number + offset;
    offset += 1;
    const id = `RA-${generatedOn.replaceAll('-', '')}-${number}`;
    const xml = buildVoidedDocuments({
      id,
      referenceDate: date,
      issueDate: generatedOn,
      issuer: context.issuer,
      reason: input.reason,
      lines: group.map((member) => member.document),
    });
    const signed = sign(xml, context.certificate, { signature: context.signature });
    const fileName = voidedDocumentsFileName(context.issuer.ruc.value, generatedOn, number);
    const record: SubmissionRecord = {
      id,
      status: Status.Processing,
      xml: signed,
      members: group,
    };
    let ticket: string;
    try {
      ticket = (
        await context.transport.sendSummary({
          fileName,
          zip: zipDocument(fileName, signed),
          username: `${context.issuer.ruc.value}${context.sol.user}`,
        })
      ).ticket;
    } catch (error) {
      throw new TribuError({
        kind: 'unconfirmed',
        issues: [transportIssue(errorMessage(error))],
        record: { ...record, status: Status.Unconfirmed },
        // The earlier groups already have a Ticket: never lose them (ADR 0008).
        context: { records: results.map((result) => result.record) },
      });
    }
    results.push({ record: { ...record, ticket }, warnings: [] });
  }
  return results;
}

export interface WaitOptions {
  readonly interval?: number;
  readonly timeout?: number;
}

export async function waitFor(
  context: ClientContext,
  record: TribuRecord,
  options: WaitOptions = {},
): Promise<{ readonly record: TribuRecord; readonly documents: readonly MemberRecord[] }> {
  if (record.ticket === undefined)
    throw configIssue(
      'The Record has no Ticket.',
      'Pass a Record returned by dailySummary or voidDocuments.',
    );
  if (record.xml === undefined)
    throw configIssue(
      'The Record has no XML.',
      'Pass a Record returned by dailySummary or voidDocuments.',
    );
  const xml = record.xml;
  const interval = options.interval ?? 3_000;
  const timeout = options.timeout ?? context.timeout;
  const started = Date.now();
  while (true) {
    if (Date.now() - started >= timeout) {
      throw new TribuError({
        kind: 'unconfirmed',
        issues: [
          issue(
            'ticket',
            'unconfirmed',
            `SUNAT did not finish the Ticket within ${timeout} ms.`,
            'Keep the Record and call sunat.waitFor(record) again later.',
            'ADR 0015',
          ),
        ],
        record: { ...record, status: Status.Processing },
      });
    }
    const answer: StatusAnswer = await context.transport.getStatus(record.ticket);
    if (answer.statusCode === TicketStatus.ProcessedWithErrors.code) {
      const documents = (record.members ?? []).map((member) => ({
        ...member,
        status: Status.Rejected,
      }));
      const rejected: SubmissionRecord = {
        id: record.id,
        status: Status.Rejected,
        xml,
        members: documents,
        ...(record.ticket === undefined ? {} : { ticket: record.ticket }),
        ...(answer.cdr === undefined ? {} : { cdr: answer.cdr }),
      };
      throw new TribuError({
        kind: 'rejected',
        issues:
          answer.cdr === undefined
            ? [
                issue(
                  'ticket',
                  '99',
                  'SUNAT processed the submission with errors.',
                  'Check the CDR.',
                  'SUNAT',
                ),
              ]
            : [
                issue(
                  'cdr',
                  answer.cdr.code,
                  answer.cdr.description,
                  'Correct the submission and send it again.',
                  'SUNAT CDR',
                ),
              ],
        record: rejected,
      });
    }
    if (answer.statusCode === TicketStatus.Processed.code) {
      // A Voided Documents file voids every member; a Daily Summary marks condition 3 as voided.
      const documents = (record.members ?? []).map((member) => ({
        ...member,
        status:
          record.id.startsWith('RA-') || member.condition === '3' ? Status.Voided : Status.Accepted,
      }));
      return { record: { ...record, status: Status.Accepted, members: documents }, documents };
    }
    await sleep(interval);
  }
}

export interface RetryOptions {
  readonly recovery?: RecoveryValue;
}

export async function retryIssue(
  context: ClientContext,
  record: ErrorRecord,
  options: RetryOptions = {},
): Promise<IssueResult<DocumentRecord>> {
  const document = record.document as Document | undefined;
  const xml = record.xml;
  if (document === undefined || xml === undefined || document.number === undefined) {
    throw configIssue('The Record has no signed document.', 'Pass a Record issued by Tribu.');
  }
  const kind = kindOf(document.type);
  const fileName = documentFileName(
    context.issuer.ruc.value,
    document as Document & { number: number },
  );
  const submission: Submission = {
    fileName,
    zip: zipDocument(fileName, xml),
    username: `${context.issuer.ruc.value}${context.sol.user}`,
  };
  const failure = new TransportFailure('manual retry', { sent: true });
  const lookup: CdrLookup = {
    ruc: context.issuer.ruc.value,
    documentType: document.type.code,
    series: document.series,
    number: document.number,
  };
  const outcome = await recover(
    context,
    kind,
    submission,
    failure,
    options.recovery ?? context.recovery[kind],
    lookup,
  );
  const finished: DocumentRecord = {
    id: record.id,
    status: outcome.status,
    document,
    xml,
    qr: record.qr ?? qrText(document),
    hash: record.hash ?? createHash('sha256').update(xml).digest('hex'),
    ...(outcome.cdr === undefined ? {} : { cdr: outcome.cdr }),
  };
  if (outcome.kind !== undefined) {
    throw new TribuError({ kind: outcome.kind, issues: outcome.issues ?? [], record: finished });
  }
  return { record: finished, warnings: [] };
}
