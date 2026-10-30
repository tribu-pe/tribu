import type { Document, IdentifiedCustomer } from './document';

const DAY = 86_400_000;

/** Whole calendar days from one YYYY-MM-DD date to another (Lima dates, no time zone math). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

/** The Receipt's unidentified customer. The Document type keeps the identified shape (ADR 0001). */
export function anonymousCustomer(): IdentifiedCustomer {
  return { anonymous: true } as unknown as IdentifiedCustomer;
}

/** A Receipt may leave the customer unidentified. */
export function isAnonymous(
  customer: IdentifiedCustomer | { readonly anonymous: true },
): customer is { readonly anonymous: true } {
  return (customer as { anonymous?: boolean }).anonymous === true;
}

/** The document a Note modifies, when the caller gave Tribu the Record. */
export function affectedDocument(context: {
  readonly affected?: { readonly document?: Document };
}): Document | undefined {
  return context.affected?.document;
}
