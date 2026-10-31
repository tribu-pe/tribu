import type { IgvRegime } from './catalogs/igv';
import { Igv } from './catalogs/igv';
import type { SeriesConfig } from './documents/calculate';
import type { Document } from './documents/document';
import { daysBetween } from './documents/predicates';
import { Ruc } from './documents/ruc';
import {
  type CallOptions,
  type ClientContext,
  type DailySummaryInput,
  dailySummary,
  issueCreditNote,
  issueDebitNote,
  issueInvoice,
  issueReceipt,
  limaToday,
  preview,
  type RetryOptions,
  retryIssue,
  type VoidDocumentsInput,
  validateOnly,
  voidDocuments,
  type WaitOptions,
  waitFor,
} from './issue';
import {
  Recovery,
  type RecoveryValue,
  Rounding,
  type RoundingValue,
  Signature,
  type SignatureValue,
} from './options';
import type {
  DocumentRecord,
  IssueResult,
  MemberRecord,
  SubmissionRecord,
  TribuRecord,
} from './results/record';
import type { Issue } from './results/tribu-error';
import { issue, TribuError } from './results/tribu-error';
import { type OpenCertificate, openCertificate } from './signing/certificate';
import type { SunatTransport } from './transport/send';
import { sunatTransport } from './transport/sunat';

export interface IssuerOptions {
  readonly ruc: string | Ruc;
  readonly name: string;
  readonly ubigeo: string;
  readonly igv?: IgvRegime;
  /** The Issuer's Banco de la Nación account, for Invoices with a detracción (ADR 0020). */
  readonly detraccionAccount?: string;
}

export interface CreateOptions {
  readonly env?: 'beta' | 'production';
  readonly issuer: IssuerOptions;
  readonly sol?: { readonly user: string; readonly password: string };
  readonly certificate: { readonly pfx: Buffer; readonly passphrase: string };
  readonly transport?: SunatTransport;
  readonly series?: {
    readonly invoice?: string;
    readonly receipt?: string;
    readonly creditNote?: { readonly invoice?: string; readonly receipt?: string };
    readonly debitNote?: { readonly invoice?: string; readonly receipt?: string };
  };
  readonly rounding?: RoundingValue;
  readonly signature?: SignatureValue;
  readonly recovery?:
    | RecoveryValue
    | Partial<Record<'invoice' | 'receipt' | 'creditNote' | 'debitNote', RecoveryValue>>;
  readonly timeout?: number;
  readonly retry?: {
    readonly attempts?: number;
    readonly delay?: number | ((attempt: number) => number);
  };
  readonly nextNumber?: (series: string) => Promise<number>;
  readonly rules?: { readonly disable: readonly string[] };
}

export interface TribuConfig {
  readonly env: 'beta' | 'production';
  readonly issuer: {
    readonly ruc: Ruc;
    readonly name: string;
    readonly ubigeo: string;
    readonly igv: IgvRegime;
    readonly detraccionAccount?: string;
  };
  readonly sol: { readonly user: string; readonly password: string };
  readonly certificate: {
    readonly notBefore: string;
    readonly notAfter: string;
    readonly passphrase: string;
  };
  readonly series: SeriesConfig;
  readonly rounding: RoundingValue;
  readonly signature: SignatureValue;
  readonly recovery: Record<'invoice' | 'receipt' | 'creditNote' | 'debitNote', RecoveryValue>;
  readonly timeout: number;
  readonly retry: {
    readonly attempts: number;
    readonly delay: number | ((attempt: number) => number);
  };
  readonly rules: { readonly disable: readonly string[] };
}

export interface Client {
  readonly env: 'beta' | 'production';
  readonly config: TribuConfig;
  readonly warnings: readonly Issue[];
  invoice(
    input: Parameters<typeof issueInvoice>[1],
    options?: CallOptions,
  ): Promise<IssueResult<DocumentRecord>>;
  receipt(
    input: Parameters<typeof issueReceipt>[1],
    options?: CallOptions,
  ): Promise<IssueResult<DocumentRecord>>;
  creditNote(
    input: Parameters<typeof issueCreditNote>[1],
    options?: CallOptions,
  ): Promise<IssueResult<DocumentRecord>>;
  debitNote(
    input: Parameters<typeof issueDebitNote>[1],
    options?: CallOptions,
  ): Promise<IssueResult<DocumentRecord>>;
  preview(input: Parameters<typeof preview>[1], type?: Parameters<typeof preview>[2]): Document;
  validate(
    input: Parameters<typeof validateOnly>[1],
    type?: Parameters<typeof validateOnly>[2],
  ): Promise<void>;
  dailySummary(input: DailySummaryInput): Promise<IssueResult<SubmissionRecord>>;
  waitFor(
    record: TribuRecord,
    options?: WaitOptions,
  ): Promise<{ readonly record: TribuRecord; readonly documents: readonly MemberRecord[] }>;
  voidDocuments(input: VoidDocumentsInput): Promise<IssueResult<SubmissionRecord>[]>;
  retry(
    record: Parameters<typeof retryIssue>[1],
    options?: RetryOptions,
  ): Promise<IssueResult<DocumentRecord>>;
}

function isRounding(value: unknown): value is RoundingValue {
  const candidate = value as { readonly rounding?: string } | null;
  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    (candidate.rounding === 'half-up' || candidate.rounding === 'half-even')
  );
}

function isSignature(value: unknown): value is SignatureValue {
  const candidate = value as { readonly algorithm?: string } | null;
  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    (candidate.algorithm === 'rsa-sha1' || candidate.algorithm === 'rsa-sha256')
  );
}

function isRecovery(value: unknown): value is RecoveryValue {
  const candidate = value as { readonly strategy?: string } | null;
  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    (candidate.strategy === 'confirm' || candidate.strategy === 'resend')
  );
}

const SERIES_KINDS = ['invoice', 'receipt', 'creditNote', 'debitNote'] as const;

const ALLOWED_OPTIONS = new Set([
  'env',
  'issuer',
  'sol',
  'certificate',
  'transport',
  'series',
  'rounding',
  'signature',
  'recovery',
  'timeout',
  'retry',
  'nextNumber',
  'rules',
]);

export function create(options: CreateOptions): Client {
  const issues: Issue[] = [];
  const warnings: Issue[] = [];
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTIONS.has(key)) {
      issues.push(
        issue(
          key,
          'option',
          `tribu.create has no option "${key}".`,
          'Remove it: every option takes a constant, never a free-text value.',
          'ADR 0012',
        ),
      );
    }
  }
  const scope = globalThis as { window?: unknown; document?: unknown };
  if (scope.window !== undefined || scope.document !== undefined) {
    issues.push(
      issue(
        'environment',
        'server',
        'Tribu runs on the server: it holds the Certificate and the SOL password.',
        'Call tribu.create from a Node.js backend, never from a browser.',
        'ADR 0009',
      ),
    );
  }

  const rawEnv = options.env ?? process.env['SUNAT_ENV'] ?? 'production';
  const env = rawEnv as 'beta' | 'production';
  if (rawEnv !== 'beta' && rawEnv !== 'production') {
    issues.push(
      issue(
        'env',
        'env',
        `"${String(rawEnv)}" is not an environment.`,
        "Use env: 'beta' or env: 'production'.",
        'ADR 0002',
      ),
    );
  }

  let ruc: Ruc | undefined;
  try {
    ruc = Ruc.from(options.issuer.ruc);
  } catch (error) {
    const first = error instanceof TribuError ? error.issues[0] : undefined;
    issues.push({
      ...(first ??
        issue('issuer.ruc', 'ruc', 'The issuer RUC is not valid.', 'Pass a valid RUC.', 'SUNAT')),
      path: 'issuer.ruc',
    });
  }

  const igv = options.issuer.igv ?? Igv.General;
  if (!isIgv(igv)) {
    issues.push(
      issue(
        'issuer.igv',
        'igv',
        'The IGV regime must be a constant.',
        'Use Igv.General or Igv.Hospitality.',
        'ADR 0012',
      ),
    );
  }

  const account = options.issuer.detraccionAccount;
  // factura-2.0.csv: the account number is an..100 and not empty (ERR 3034).
  if (account !== undefined && (account.trim().length === 0 || account.length > 100)) {
    issues.push(
      issue(
        'issuer.detraccionAccount',
        '3034',
        'The Banco de la Nación account must have 1 to 100 characters.',
        'Pass the account number as SUNAT shows it, or leave detraccionAccount out.',
        'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      ),
    );
  }

  const solUser = options.sol?.user ?? process.env['SUNAT_SOL_USER'];
  const solPassword = options.sol?.password ?? process.env['SUNAT_SOL_PASSWORD'];
  if (solUser === undefined) {
    issues.push(
      issue(
        'sol.user',
        'sol',
        'The SOL user is missing.',
        'Set SUNAT_SOL_USER or pass sol.user.',
        'ADR 0002',
      ),
    );
  }
  if (solPassword === undefined) {
    issues.push(
      issue(
        'sol.password',
        'sol',
        'The SOL password is missing.',
        'Set SUNAT_SOL_PASSWORD or pass sol.password.',
        'ADR 0002',
      ),
    );
  }
  if (solUser === 'MODDATOS' && env === 'production') {
    issues.push(
      issue(
        'sol.user',
        'sol',
        "MODDATOS is SUNAT's public beta user, not a production one.",
        "Call tribu.create with env: 'beta' while testing.",
        'ADR 0002',
      ),
    );
  }
  if (ruc !== undefined && solUser?.startsWith(ruc.value) === true) {
    issues.push(
      issue(
        'sol.user',
        'sol',
        'The SOL user must go without the RUC: Tribu concatenates it.',
        'Pass the user without the RUC.',
        'Manual del Programador §2.2',
      ),
    );
  }

  const series: SeriesConfig = {
    invoice: options.series?.invoice ?? 'F001',
    receipt: options.series?.receipt ?? 'B001',
    creditNote: {
      invoice: options.series?.creditNote?.invoice ?? 'FC01',
      receipt: options.series?.creditNote?.receipt ?? 'BC01',
    },
    debitNote: {
      invoice: options.series?.debitNote?.invoice ?? 'FD01',
      receipt: options.series?.debitNote?.receipt ?? 'BD01',
    },
  };
  checkSeries('series.invoice', series.invoice, /^F[A-Z0-9]{3}$/, issues);
  checkSeries('series.receipt', series.receipt, /^B[A-Z0-9]{3}$/, issues);
  checkSeries('series.creditNote.invoice', series.creditNote.invoice, /^F[A-Z0-9]{3}$/, issues);
  checkSeries('series.creditNote.receipt', series.creditNote.receipt, /^B[A-Z0-9]{3}$/, issues);
  checkSeries('series.debitNote.invoice', series.debitNote.invoice, /^F[A-Z0-9]{3}$/, issues);
  checkSeries('series.debitNote.receipt', series.debitNote.receipt, /^B[A-Z0-9]{3}$/, issues);

  let certificate: OpenCertificate | undefined;
  try {
    certificate = openCertificate(options.certificate.pfx, options.certificate.passphrase);
  } catch (error) {
    if (!(error instanceof TribuError)) throw error;
    issues.push(...error.issues);
  }
  if (certificate !== undefined) {
    const today = limaToday();
    if (certificate.notAfter < today) {
      issues.push(
        issue(
          'certificate',
          'certificate',
          `The certificate expired on ${certificate.notAfter}.`,
          'Use a certificate in force.',
          'ADR 0009',
        ),
      );
    } else if (daysBetween(today, certificate.notAfter) <= 30) {
      warnings.push(
        issue(
          'certificate',
          'certificate',
          `The certificate expires on ${certificate.notAfter}.`,
          'Renew it before that date.',
          'ADR 0009',
        ),
      );
    }
  }

  const rounding = options.rounding ?? Rounding.HalfUp;
  if (!isRounding(rounding)) {
    issues.push(
      issue(
        'rounding',
        'rounding',
        'Rounding must be a constant.',
        'Use Rounding.HalfUp or Rounding.HalfEven.',
        'ADR 0018',
      ),
    );
  }
  const signature = options.signature ?? Signature.RsaSha256;
  if (!isSignature(signature)) {
    issues.push(
      issue(
        'signature',
        'signature',
        'The signature must be a constant.',
        'Use Signature.RsaSha1 or Signature.RsaSha256.',
        'ADR 0018',
      ),
    );
  }

  const recovery = recoveryOf(options.recovery, issues);

  const timeout = options.timeout ?? 30_000;
  const retry = {
    attempts: options.retry?.attempts ?? 3,
    delay: options.retry?.delay ?? 1_000,
  };
  const disabled = [...(options.rules?.disable ?? [])];

  const ready = {
    ruc,
    certificate,
    solUser,
    solPassword,
  };
  if (
    issues.length > 0 ||
    ready.ruc === undefined ||
    ready.certificate === undefined ||
    ready.solUser === undefined ||
    ready.solPassword === undefined
  ) {
    throw new TribuError({ kind: 'config', issues });
  }

  const transport =
    options.transport ??
    sunatTransport({
      env,
      issuerRuc: ready.ruc.value,
      sol: { user: ready.solUser, password: ready.solPassword },
      timeout,
    });

  const config: TribuConfig = Object.freeze({
    env,
    issuer: {
      ruc: ready.ruc,
      name: options.issuer.name,
      ubigeo: options.issuer.ubigeo,
      igv,
      ...(account === undefined ? {} : { detraccionAccount: account }),
    },
    sol: { user: ready.solUser, password: '[REDACTED]' },
    certificate: {
      notBefore: ready.certificate.notBefore,
      notAfter: ready.certificate.notAfter,
      passphrase: '[REDACTED]',
    },
    series,
    rounding,
    signature,
    recovery,
    timeout,
    retry,
    rules: { disable: disabled },
  });

  const context: ClientContext = {
    env,
    issuer: {
      ruc: ready.ruc,
      name: options.issuer.name,
      ubigeo: options.issuer.ubigeo,
      igv,
      ...(account === undefined ? {} : { detraccionAccount: account }),
    },
    sol: { user: ready.solUser, password: ready.solPassword },
    certificate: ready.certificate,
    transport,
    series,
    rounding,
    signature,
    recovery,
    timeout,
    retry,
    rules: { disable: disabled },
    ...(options.nextNumber === undefined ? {} : { nextNumber: options.nextNumber }),
  };

  return {
    env,
    config,
    warnings,
    invoice: (input, call) => issueInvoice(context, input, call),
    receipt: (input, call) => issueReceipt(context, input, call),
    creditNote: (input, call) => issueCreditNote(context, input, call),
    debitNote: (input, call) => issueDebitNote(context, input, call),
    preview: (input, type) => preview(context, input, type),
    validate: (input, type) => validateOnly(context, input, type),
    dailySummary: (input) => dailySummary(context, input),
    waitFor: (record, wait) => waitFor(context, record, wait),
    voidDocuments: (input) => voidDocuments(context, input),
    retry: (record, retryOptions) => retryIssue(context, record, retryOptions),
  };
}

function isIgv(value: unknown): value is IgvRegime {
  const candidate = value as { readonly code?: string } | null;
  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    (candidate.code === Igv.General.code || candidate.code === Igv.Hospitality.code)
  );
}

function checkSeries(path: string, value: string, pattern: RegExp, issues: Issue[]): void {
  if (!pattern.test(value)) {
    issues.push(
      issue(
        path,
        '1001',
        `The series "${value}" does not match ${pattern.source}.`,
        'Use a series such as F001 or B001; a note series starts with the letter of the document it modifies.',
        'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      ),
    );
  }
}

function recoveryOf(
  input: CreateOptions['recovery'],
  issues: Issue[],
): Record<'invoice' | 'receipt' | 'creditNote' | 'debitNote', RecoveryValue> {
  const defaults = {
    invoice: Recovery.Confirm,
    receipt: Recovery.Confirm,
    creditNote: Recovery.Confirm,
    debitNote: Recovery.Confirm,
  };
  if (input === undefined) return defaults;
  if (isRecovery(input)) {
    return { invoice: input, receipt: input, creditNote: input, debitNote: input };
  }
  const resolved: Record<'invoice' | 'receipt' | 'creditNote' | 'debitNote', RecoveryValue> = {
    ...defaults,
  };
  for (const kind of SERIES_KINDS) {
    const value = (input as Partial<Record<(typeof SERIES_KINDS)[number], RecoveryValue>>)[kind];
    if (value === undefined) continue;
    if (!isRecovery(value)) {
      issues.push(
        issue(
          'recovery',
          'recovery',
          `The recovery for ${kind} must be a constant.`,
          'Use Recovery.Confirm or Recovery.Resend.',
          'ADR 0015',
        ),
      );
      continue;
    }
    resolved[kind] = value;
  }
  return resolved;
}
