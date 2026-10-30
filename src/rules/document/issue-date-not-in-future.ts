import { DocumentType } from '../../catalogs/shared';
import { daysBetween } from '../../documents/predicates';
import { Rule } from '../rule';

// Validation workbook: IssueDate more than 2 days after the sending date.
export const issueDateNotInFuture = Rule.define({
  id: 'document/issue-date-not-in-future',
  appliesTo: [
    DocumentType.Invoice,
    DocumentType.Receipt,
    DocumentType.CreditNote,
    DocumentType.DebitNote,
  ],
  sunatCode: '2329',
  effectiveFrom: '2018-01-01',
  why: 'IssueDate cannot be more than 2 days after the day the document is sent.',
  fix: 'Issue the document today or up to 2 days ahead, in Lima time.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document, context) {
    return daysBetween(document.issueDate, context.today) < -2 ? { path: 'issueDate' } : true;
  },
});
