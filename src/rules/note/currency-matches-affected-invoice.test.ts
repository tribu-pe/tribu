import { describe, expect, test } from 'vitest';
import { aCreditNote, anInvoice, aRecordOf } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { Currency } from '../../catalogs/index';
import { currencyMatchesAffectedInvoice } from './currency-matches-affected-invoice';

// nota-credito-2.0.csv: for invoices SUNAT rejects a currency mismatch (ERROR 3209); for receipts it
// only observes it (OBS 4368, see currency-matches-affected-receipt). One requirement, two Rules (ADR 0011).
describe('note/currency-matches-affected-invoice (ERR 3209)', () => {
  const affected = aRecordOf(anInvoice(), 123);

  test('accepts a note in the invoice currency', () => {
    expect(
      errorsOf(currencyMatchesAffectedInvoice, aCreditNote({ modifies: affected }), { affected }),
    ).toEqual([]);
  });

  test('rejects a note in another currency', () => {
    const note = aCreditNote({ modifies: affected, currency: Currency.Usd });
    expect(errorsOf(currencyMatchesAffectedInvoice, note, { affected })[0]).toMatchObject({
      code: '3209',
      path: 'currency',
    });
  });
});
