import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { issuesOf } from '../../../test/support/rules';
import { classificationFormat } from './classification-format';

// factura-2.0.csv: the SUNAT Product Code is optional; when present it must be 8 digits (ERR 3496),
// an observation that becomes an ERROR on 2027-01-01 (control-de-cambios.csv, 2026-04-24).
describe('item/classification-format (3496)', () => {
  const withClassification = (classification: string, issueDate = '2026-10-23') =>
    anInvoice(
      { issueDate, items: [{ description: 'Teclado', quantity: 1, price: 118, classification }] },
      { today: issueDate },
    );

  test('accepts 8 digits', () => {
    expect(issuesOf(classificationFormat, withClassification('43211706'))).toEqual([]);
  });

  test('accepts an item without classification', () => {
    expect(issuesOf(classificationFormat, anInvoice())).toEqual([]);
  });

  test('warns about a malformed code in 2026', () => {
    const [issue] = issuesOf(classificationFormat, withClassification('4321170'));
    expect(issue).toMatchObject({ code: '3496', path: 'items[0].classification' });
  });

  test('blocks it from 2027-01-01', () => {
    const invoice = withClassification('4321170', '2027-01-04');
    const result = issuesOf(classificationFormat, invoice, { today: '2027-01-04' });
    expect(result).toHaveLength(1);
  });

  test.todo('checks the code against catalog 25 (UNSPSC) when tribu/catalogs/product exists');
});
