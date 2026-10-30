import { DocumentType } from '../../catalogs/shared';
import { daysBetween } from '../../documents/predicates';
import { Rule } from '../rule';

// R.S. 097-2012 art. 21.1 b): the Daily Summary reaches SUNAT by the 7th calendar day after issue.
export const sendDeadline = Rule.define({
  id: 'daily-summary/send-deadline',
  appliesTo: [DocumentType.Receipt],
  sunatCode: '4443',
  effectiveFrom: '2024-11-11',
  why: 'A Receipt belongs in a Daily Summary by the 7th calendar day after its issue date.',
  fix: 'Send the Daily Summary within 7 days of the Receipt issue date; SUNAT only observes it late.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/resumen-diario-1.1.csv',
  check(document, context) {
    if (context.channel !== 'summary') return true;
    return daysBetween(document.issueDate, context.today) > 7 ? { path: 'issueDate' } : true;
  },
});
