import { describe, expect, test } from 'vitest';
import { aReceipt } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { customerIdentifiedAboveLimit } from './customer-identified-above-limit';

// A Receipt over S/ 700.00 must identify the Customer. SUNAT checks it in the Daily Summary
// (resumen-diario-1.1.csv, ERROR 2514); Tribu checks it before any channel.
describe('receipt/customer-identified-above-limit (ERR 2514)', () => {
  const anonymous = (price: number | string) =>
    aReceipt({ customer: undefined, items: [{ description: 'Televisor', quantity: 1, price }] });

  test('accepts an anonymous receipt of exactly S/ 700.00', () => {
    expect(errorsOf(customerIdentifiedAboveLimit, anonymous('700.00'))).toEqual([]);
  });

  test('rejects an anonymous receipt of S/ 700.01', () => {
    const [issue] = errorsOf(customerIdentifiedAboveLimit, anonymous('700.01'));
    expect(issue).toMatchObject({ code: '2514', path: 'customer' });
    expect(issue?.fix).toMatch(/customer/);
  });

  test('accepts an identified customer above the limit', () => {
    const receipt = aReceipt({ items: [{ description: 'Televisor', quantity: 1, price: 2500 }] });
    expect(errorsOf(customerIdentifiedAboveLimit, receipt)).toEqual([]);
  });

  test.todo('compares in soles when the receipt is in USD (exchange rate source to be decided)');
});
