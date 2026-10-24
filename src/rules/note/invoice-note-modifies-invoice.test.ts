import { describe, expect, test } from 'vitest';
import { aCreditNote } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { invoiceNoteModifiesInvoice } from './invoice-note-modifies-invoice';

// nota-credito-2.0.csv: a note whose series starts with F must modify an invoice (ERROR 2116).
describe('note/invoice-note-modifies-invoice (ERR 2116)', () => {
  test('accepts an F-series note that modifies an invoice', () => {
    expect(errorsOf(invoiceNoteModifiesInvoice, aCreditNote({ modifies: 'F001-123' }))).toEqual([]);
  });

  test('rejects an F-series note that modifies a receipt', () => {
    const note = aCreditNote({ modifies: 'B001-45', series: 'FC01' });
    expect(errorsOf(invoiceNoteModifiesInvoice, note)[0]).toMatchObject({
      code: '2116',
      path: 'series',
    });
  });
});
