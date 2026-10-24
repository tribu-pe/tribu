import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { installmentDueAfterIssue } from './installment-due-after-issue';

// factura-2.0.csv: an Installment's due date must be after the issue date (ERROR 3267: "no puede ser
// anterior o igual a la fecha de emisión").
describe('payment/installment-due-after-issue (ERR 3267)', () => {
  test('accepts a due date the day after issue', () => {
    const invoice = anInvoice({
      issueDate: '2026-10-23',
      payment: { installments: [{ amount: 236, due: '2026-10-24' }] },
    });
    expect(errorsOf(installmentDueAfterIssue, invoice)).toEqual([]);
  });

  test('rejects a due date on the issue date, pointing at that installment', () => {
    const invoice = anInvoice({
      issueDate: '2026-10-23',
      payment: {
        installments: [
          { amount: 118, due: '2026-11-30' },
          { amount: 118, due: '2026-10-23' },
        ],
      },
    });
    expect(errorsOf(installmentDueAfterIssue, invoice)[0]).toMatchObject({
      code: '3267',
      path: 'payment.installments[1].due',
    });
  });
});
