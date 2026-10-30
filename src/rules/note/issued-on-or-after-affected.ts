import { DocumentType } from '../../catalogs/shared';
import { daysBetween } from '../../documents/predicates';
import { Rule } from '../rule';

// nota-credito-2.0.csv: the note is issued on or after the document it modifies.
export const issuedOnOrAfterAffected = Rule.define({
  id: 'note/issued-on-or-after-affected',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '2885',
  effectiveFrom: '2018-01-01',
  why: 'The issue date of a Note cannot be before the issue date of the document it modifies.',
  fix: 'Issue the Note on or after the modified document.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document, context) {
    if (context.affected?.document === undefined) return true;
    return daysBetween(context.affected.document.issueDate, document.issueDate) < 0
      ? { path: 'issueDate' }
      : true;
  },
});
