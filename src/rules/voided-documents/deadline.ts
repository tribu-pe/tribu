import { DocumentType } from '../../catalogs/shared';
import { daysBetween } from '../../documents/predicates';
import { Rule } from '../rule';

// R.S. 000048-2026 art. 9 and the validation workbook: 7 calendar days from the issue date.
export const deadline = Rule.define({
  id: 'voided-documents/deadline',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '2957',
  effectiveFrom: '2019-10-30',
  why: 'A document is voided within 7 calendar days of its issue date.',
  fix: 'Past 7 days, use sunat.creditNote(...) with Reason.Void instead.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/comunicacion-de-baja-1.0.csv',
  check(document, context) {
    if (context.channel !== 'voiding') return true;
    return daysBetween(document.issueDate, context.today) > 7 ? { path: 'issueDate' } : true;
  },
});
