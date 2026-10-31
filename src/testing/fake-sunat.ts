import { ReturnCode } from '../catalogs/return-code';
import { ResponseCode } from '../catalogs/shared';
import type { Cdr } from '../results/record';
import {
  type CdrLookup,
  type StatusAnswer,
  type Submission,
  type SunatTransport,
  TransportFailure,
} from '../transport/send';

export interface FakeSunatOptions {
  readonly reject?: Record<string, string>;
  readonly observe?: Record<string, string[]>;
  readonly exception?: Record<string, string>;
  readonly fail?: Record<string, ('before-send' | 'after-send')[]>;
  readonly hang?: string[];
  readonly lookup?: Record<string, 'accepted' | 'not-found'>;
  readonly tickets?: string[];
}

export interface SubmissionLog {
  readonly fileName: string;
  readonly username?: string;
}

/** An in-memory SUNAT for tests and for integrators (ADR 0017). */
export interface FakeSunat extends Omit<SunatTransport, 'getStatus'> {
  readonly submissions: SubmissionLog[];
  readonly attempts: Record<string, number>;
  readonly delaysBetweenAttempts: Record<string, number[]>;
  readonly lookups: string[];
  readonly statusQueries: number;
  getStatus(ticket: string | { readonly ticket: string }): Promise<StatusAnswer>;
}

const logOf = (submission: Submission): SubmissionLog =>
  submission.username === undefined
    ? { fileName: submission.fileName }
    : { fileName: submission.fileName, username: submission.username };

const cdr = (documentId: string, code: string, observations: readonly string[]): Cdr => ({
  documentId,
  code,
  response: ResponseCode.classify(code),
  description: code === '0' ? 'Aceptado' : `SUNAT answered ${code}`,
  observations: observations.map((observation) => ({
    code: observation,
    message: ReturnCode.from(observation).name,
  })),
  xml: '<ApplicationResponse/>',
});

const documentIdOf = (fileName: string): string => fileName.split('-').slice(2).join('-');

export function fakeSunat(options: FakeSunatOptions = {}): FakeSunat {
  const submissions: SubmissionLog[] = [];
  const attempts: Record<string, number> = {};
  const delaysBetweenAttempts: Record<string, number[]> = {};
  const lookups: string[] = [];
  let statusQueries = 0;
  let ticketsIssued = 0;
  const lastAttempt = new Map<string, number>();
  const failures = new Map<string, ('before-send' | 'after-send')[]>(
    Object.entries(options.fail ?? {}).map(([id, queue]) => [id, [...queue]]),
  );
  const hung = new Set(options.hang ?? []);
  const tickets = [...(options.tickets ?? [])];

  return {
    submissions,
    attempts,
    delaysBetweenAttempts,
    lookups,
    get statusQueries() {
      return statusQueries;
    },

    async sendBill(submission: Submission): Promise<Cdr> {
      const id = documentIdOf(submission.fileName);
      attempts[id] = (attempts[id] ?? 0) + 1;
      const now = Date.now();
      const previous = lastAttempt.get(id);
      if (previous !== undefined) {
        const delays = delaysBetweenAttempts[id] ?? [];
        delays.push(now - previous);
        delaysBetweenAttempts[id] = delays;
      }
      lastAttempt.set(id, now);

      const queue = failures.get(id);
      if (queue !== undefined && queue.length > 0) {
        const failure = queue.shift();
        if (failure === 'before-send')
          throw new TransportFailure('The file never left', { sent: false });
        submissions.push(logOf(submission));
        throw new TransportFailure('The answer was lost after sending', { sent: true });
      }

      submissions.push(logOf(submission));

      const exception = options.exception?.[id];
      if (exception !== undefined) {
        throw new TransportFailure(`SUNAT answered with exception ${exception}`, {
          sent: true,
          code: exception,
        });
      }
      if (hung.has(id)) return new Promise<Cdr>(() => {});

      const rejected = options.reject?.[id];
      if (rejected !== undefined) return cdr(id, rejected, []);
      const observed = options.observe?.[id] ?? [];
      return cdr(id, '0', observed);
    },

    async sendSummary(submission: Submission): Promise<{ ticket: string }> {
      submissions.push(logOf(submission));
      ticketsIssued += 1;
      return { ticket: `T-${ticketsIssued}` };
    },

    async getStatus(ticket: string | { readonly ticket: string }): Promise<StatusAnswer> {
      statusQueries += 1;
      const statusCode = tickets.shift() ?? '0';
      // Like SUNAT, a processed Ticket comes with its CDR.
      if (statusCode !== '0') return { statusCode };
      return { statusCode, cdr: cdr(typeof ticket === 'string' ? ticket : ticket.ticket, '0', []) };
    },

    async getStatusCdr(lookup: CdrLookup): Promise<Cdr | undefined> {
      const id = `${lookup.series}-${lookup.number}`;
      lookups.push(id);
      return options.lookup?.[id] === 'accepted' ? cdr(id, '0', []) : undefined;
    },
  };
}
