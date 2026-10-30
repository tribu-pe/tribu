import type { CatalogEntry } from '../catalogs/catalog';
import type { Document } from '../documents/document';
import type { LifecycleState } from './lifecycle';
import type { ErrorRecord, Issue, TribuError } from './tribu-error';

export interface Observation {
  readonly code: string;
  readonly message: string;
}

/** SUNAT's answer (CDR, Constancia de Recepción). */
export interface Cdr {
  readonly documentId: string;
  readonly code: string;
  readonly response: CatalogEntry;
  readonly description: string;
  readonly observations: readonly Observation[];
  readonly xml: string;
}

export interface MemberRecord {
  readonly id: string;
  readonly status: LifecycleState;
  readonly document: Document;
  /** Catalog 19 condition in a Daily Summary: 1 Adicionar, 3 Anulado. */
  readonly condition?: '1' | '3';
}

/**
 * What the Issuer must keep (ADR 0008): plain JSON that survives a round trip.
 * Documents carry `document`; Daily Summaries and Voided Documents carry `members`.
 */
export interface TribuRecord extends ErrorRecord {
  readonly status?: LifecycleState;
  readonly document?: Document;
  readonly qr?: string;
  readonly hash?: string;
  readonly cdr?: Cdr;
  readonly members?: readonly MemberRecord[];
}

export interface DocumentRecord extends TribuRecord {
  readonly status: LifecycleState;
  readonly document: Document;
  readonly xml: string;
  readonly qr: string;
  readonly hash: string;
}

export interface SubmissionRecord extends TribuRecord {
  readonly status: LifecycleState;
  readonly xml: string;
  readonly members: readonly MemberRecord[];
}

export interface IssueResult<R extends TribuRecord = TribuRecord> {
  readonly record: R;
  readonly error?: TribuError;
  readonly warnings: readonly Issue[];
}
