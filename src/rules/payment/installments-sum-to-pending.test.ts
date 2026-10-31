import { describe, expect, test } from 'vitest';
import { anInvoice, settings } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { Detraccion } from '../../catalogs/index';
import { installmentsSumToPending } from './installments-sum-to-pending';

// factura-2.0.csv: the Installments must add up to the amount pending payment (ERROR 3319). Without
// detracción, retention or perception the pending amount is the total: 236.00 here.
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

  // R.S. 193-2020, Annex I, item 64-A: the amount pending excludes the detracción. SUNAT does not
  // check it (docs/research/detracciones-2026-10.md § 4), so Tribu does: 236.00 − 12% = 207.68.
  test('with a detracción, installments add up to the total less the detracción', () => {
    const issuer = { ...settings().issuer, detraccionAccount: '00-000-123456' };
    const invoice = (amount: number | string) =>
      anInvoice(
        {
          detraccion: Detraccion.Maintenance,
          payment: { installments: [{ amount, due: '2026-11-30' }] },
        },
        { issuer },
      );
    expect(errorsOf(installmentsSumToPending, invoice('207.68'))).toEqual([]);
    expect(errorsOf(installmentsSumToPending, invoice(236))[0]?.code).toBe('3319');
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
