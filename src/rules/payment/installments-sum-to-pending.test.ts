import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { installmentsSumToPending } from './installments-sum-to-pending';

// factura-2.0.csv: the Installments must add up to the amount pending payment (ERROR 3319). Without
// detracción, retention or perception (outside v0.1) the pending amount is the total: 236.00 here.
describe('payment/installments-sum-to-pending (ERR 3319)', () => {
  test('accepts installments that add up to the total', () => {
    const invoice = anInvoice({
      payment: {
        installments: [
          { amount: 118, due: '2026-11-30' },
          { amount: 118, due: '2026-12-30' },
        ],
      },
    });
    expect(errorsOf(installmentsSumToPending, invoice)).toEqual([]);
  });

  test('rejects installments that fall short by one cent', () => {
    const invoice = anInvoice({
      payment: {
        installments: [
          { amount: 118, due: '2026-11-30' },
          { amount: '117.99', due: '2026-12-30' },
        ],
      },
    });
    expect(errorsOf(installmentsSumToPending, invoice)[0]).toMatchObject({
      code: '3319',
      path: 'payment.installments',
    });
  });
});
