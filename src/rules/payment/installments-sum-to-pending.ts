import { DocumentType } from '../../catalogs/shared';
import { Decimal } from '../../documents/decimal';
import { Rule } from '../rule';

// factura-2.0.csv: the Installments add up to the amount pending payment.
export const installmentsSumToPending = Rule.define({
  id: 'payment/installments-sum-to-pending',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '3319',
  effectiveFrom: '2022-01-01',
  why: 'The Installments must add up to the amount pending payment.',
  fix: 'Adjust the installments so their sum equals the payable amount.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document) {
    if (document.payment.terms !== 'credit') return true;
    let sum = Decimal.from(0);
    for (const installment of document.payment.installments) sum = sum.plus(installment.amount);
    return sum.equals(document.payment.pending) ? true : { path: 'payment.installments' };
  },
});
