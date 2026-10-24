import { describe, expect, test } from 'vitest';
import { aCreditNote, anInvoice, aRecordOf } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { totalWithinAffected } from './total-within-affected';

// nota-credito-2.0.csv: a credit note's total must not exceed the modified document's (ERROR 3286).
describe('note/total-within-affected (ERR 3286)', () => {
  const affected = aRecordOf(
    anInvoice({ items: [{ description: 'Teclado', quantity: 2, price: 118 }] }),
    123,
  );

  test('accepts returning part of the invoice', () => {
    const note = aCreditNote({
      modifies: affected,
      items: [{ description: 'Teclado', quantity: 1, price: 118 }],
    });
    expect(errorsOf(totalWithinAffected, note, { affected })).toEqual([]);
  });

  test('accepts returning all of it', () => {
    const note = aCreditNote({
      modifies: affected,
      items: [{ description: 'Teclado', quantity: 2, price: 118 }],
    });
    expect(errorsOf(totalWithinAffected, note, { affected })).toEqual([]);
  });

  test('rejects a credit note larger than the invoice', () => {
    const note = aCreditNote({
      modifies: affected,
      items: [{ description: 'Teclado', quantity: 3, price: 118 }],
    });
    expect(errorsOf(totalWithinAffected, note, { affected })[0]).toMatchObject({
      code: '3286',
      path: 'items',
    });
  });
});
