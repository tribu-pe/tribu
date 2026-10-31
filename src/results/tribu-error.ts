export type ErrorKind = 'config' | 'validation' | 'rejected' | 'unconfirmed' | 'exception';

/** One problem, with the field that caused it and how to fix it. */
export interface Issue {
  readonly code: string;
  readonly path: string;
  readonly why: string;
  readonly fix: string;
  readonly source: string;
}

export function issue(path: string, code: string, why: string, fix: string, source: string): Issue {
  return { code, path, why, fix, source };
}

/**
 * The minimum a Record offers, so an error never depends on the document model.
 * `src/results/record.ts` narrows it for callers that hold a full Record.
 */
export interface ErrorRecord {
  readonly id: string;
  readonly status?: unknown;
  readonly document?: unknown;
  readonly xml?: string;
  readonly qr?: string;
  readonly hash?: string;
  readonly cdr?: { readonly code: string };
  readonly ticket?: string;
}

export interface TribuErrorOptions {
  readonly kind: ErrorKind;
  readonly issues: readonly Issue[];
  readonly record?: ErrorRecord;
  readonly context?: unknown;
}

function redact(value: unknown, seen: Set<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  if (value instanceof Uint8Array) return '[REDACTED]';
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    copy[key] = /password|passphrase|pfx/i.test(key) ? '[REDACTED]' : redact(item, seen);
  }
  return copy;
}

function format(issue: Issue): string {
  return `- ${issue.code} at ${issue.path}\n  Why: ${issue.why}\n  Fix: ${issue.fix}\n  Source: ${issue.source}`;
}

/**
 * The one error class: what happened, where, why, and how to fix it.
 * Secrets never reach its message, inspect() or JSON.stringify().
 */
export class TribuError extends Error {
  readonly kind: ErrorKind;
  readonly issues: readonly Issue[];
  readonly retryable: boolean;
  readonly record?: ErrorRecord;
  readonly context?: unknown;

  constructor(options: TribuErrorOptions) {
    const count = options.issues.length;
    super(
      `${count === 1 ? '1 problem' : `${count} problems`}:\n${options.issues.map(format).join('\n')}`,
    );
    this.name = 'TribuError';
    this.kind = options.kind;
    this.issues = options.issues;
    this.retryable = options.kind === 'unconfirmed';
    if (options.record !== undefined) this.record = options.record;
    if (options.context !== undefined) this.context = redact(options.context, new Set());
  }
}
