import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// factura-2.0.csv: an Installment's due date must be after the issue date.
export const installmentDueAfterIssue = Rule.define({
  id: 'payment/installment-due-after-issue',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '3267',
  effectiveFrom: '2022-01-01',
  why: 'An Installment due date cannot be on or before the issue date.',
  fix: 'Move every due date after the issue date.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document) {
    if (document.payment.terms !== 'credit') return true;
    for (const [index, installment] of document.payment.installments.entries()) {
      if (installment.due <= document.issueDate) {
        return { path: `payment.installments[${index}].due` };
      }
    }
    return true;
  },
});
