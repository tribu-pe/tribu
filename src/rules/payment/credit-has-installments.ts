import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// factura-2.0.csv, rules 174–177: credit needs at least one Installment.
export const creditHasInstallments = Rule.define({
  id: 'payment/credit-has-installments',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '3249',
  effectiveFrom: '2022-01-01',
  why: 'A credit Invoice must state at least one installment.',
  fix: 'Pass payment.installments with amount and due date.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document) {
    if (document.payment.terms !== 'credit') return true;
    return document.payment.installments.length > 0 ? true : { path: 'payment.installments' };
  },
});
