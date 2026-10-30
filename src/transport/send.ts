import type { Cdr } from '../results/record';

/** What Tribu hands the transport: the ZIP and, for the real one, who is sending it. */
export interface Submission {
  readonly fileName: string;
  readonly zip: Uint8Array;
  readonly username?: string;
}

export interface StatusAnswer {
  readonly statusCode: string;
  readonly cdr?: Cdr;
}

/** The four fields SUNAT's getStatusCdr takes (docs/research § CDR lookup). */
export interface CdrLookup {
  readonly ruc: string;
  readonly documentType: string;
  readonly series: string;
  readonly number: number;
}

/** How Tribu reaches SUNAT. `fakeSunat()` implements the same shape (ADR 0017). */
export interface SunatTransport {
  sendBill(submission: Submission): Promise<Cdr>;
  sendSummary(submission: Submission): Promise<{ readonly ticket: string }>;
  getStatus(ticket: string): Promise<StatusAnswer>;
  /**
   * Returns the CDR, or `undefined` only when the transport can prove SUNAT has no copy.
   * A fault means the answer is unknown: throw, so recovery stays conservative (ADR 0015).
   */
  getStatusCdr?(lookup: CdrLookup): Promise<Cdr | undefined>;
}

/** A failure on the way to SUNAT, telling whether the file may have arrived. */
export class TransportFailure extends Error {
  readonly sent: boolean;
  readonly code?: string;

  constructor(message: string, options: { readonly sent: boolean; readonly code?: string }) {
    super(message);
    this.name = 'TransportFailure';
    this.sent = options.sent;
    if (options.code !== undefined) this.code = options.code;
  }
}
