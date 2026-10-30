import { DocumentType } from '../../catalogs/shared';
import { daysBetween } from '../../documents/predicates';
import { Rule } from '../rule';

// R.S. 097-2012 art. 12.1 c), text from R.S. 000003-2023.
export const sendDeadline = Rule.define({
  id: 'invoice/send-deadline',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '2108',
  effectiveFrom: '2018-01-01',
  why: 'An Invoice is sent on its issue date or up to 3 calendar days later.',
  fix: 'Send the Invoice within 3 calendar days of its issue date.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document, context) {
    return daysBetween(document.issueDate, context.today) > 3 ? { path: 'issueDate' } : true;
  },
});
