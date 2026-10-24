import { describe, expect, test } from 'vitest';
import { aCreditNote } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { receiptNoteModifiesReceipt } from './receipt-note-modifies-receipt';

// nota-credito-2.0.csv: a note whose series starts with B must modify a receipt (ERROR 2399).
describe('note/receipt-note-modifies-receipt (ERR 2399)', () => {
  const receiptCustomer = { dni: '12345678', name: 'Juan Pérez' };

  test('accepts a B-series note that modifies a receipt', () => {
    const note = aCreditNote({ modifies: 'B001-45', customer: receiptCustomer });
    expect(errorsOf(receiptNoteModifiesReceipt, note)).toEqual([]);
  });

  test('rejects a B-series note that modifies an invoice', () => {
    const note = aCreditNote({ modifies: 'F001-123', series: 'BC01' });
    const [issue] = errorsOf(receiptNoteModifiesReceipt, note);
    expect(issue).toMatchObject({ code: '2399', path: 'series' });
    expect(issue?.fix).toMatch(/FC01|series\.creditNote\.invoice/);
  });
});
