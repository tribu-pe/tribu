import { DocumentType } from '../../catalogs/shared';
import { daysBetween } from '../../documents/predicates';
import { Rule } from '../rule';

// R.S. 097-2012 art. 7.3, text from R.S. 114-2019: individually, up to 5 calendar days.
export const individualSendDeadline = Rule.define({
  id: 'receipt/individual-send-deadline',
  appliesTo: [DocumentType.Receipt],
  sunatCode: '1079',
  effectiveFrom: '2019-06-24',
  why: 'A Receipt may be sent on its own up to 5 calendar days after issue.',
  fix: 'Send it in a Daily Summary (sunat.dailySummary) or within 5 days of the issue date.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/boleta-2.0.csv',
  check(document, context) {
    if (context.channel !== 'individual') return true;
    return daysBetween(document.issueDate, context.today) > 5 ? { path: 'issueDate' } : true;
  },
});
