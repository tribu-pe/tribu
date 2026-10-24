import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { creditHasInstallments } from './credit-has-installments';

// factura-2.0.csv, rules 174–177 (ERROR since 2022-01-01): a credit invoice to a RUC customer needs at
// least one Installment (ERROR 3249).
describe('payment/credit-has-installments (ERR 3249)', () => {
  test('accepts a credit invoice with installments', () => {
    const invoice = anInvoice({ payment: { installments: [{ amount: 236, due: '2026-11-30' }] } });
    expect(errorsOf(creditHasInstallments, invoice)).toEqual([]);
  });

  test('accepts a cash invoice', () => {
    expect(errorsOf(creditHasInstallments, anInvoice())).toEqual([]);
  });

  test('rejects a credit invoice without installments', () => {
    const invoice = anInvoice({ payment: { installments: [] } });
    expect(errorsOf(creditHasInstallments, invoice)[0]).toMatchObject({
      code: '3249',
      path: 'payment.installments',
    });
  });
});
