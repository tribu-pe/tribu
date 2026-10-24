import { describe, expect, test } from 'vitest';
import { aCreditNote, aReceipt, aRecordOf } from '../../../test/support/documents';
import { errorsOf, warningsOf } from '../../../test/support/rules';
import { Currency } from '../../catalogs/index';
import { currencyMatchesAffectedReceipt } from './currency-matches-affected-receipt';

// nota-credito-2.0.csv: for receipts SUNAT only observes a currency mismatch (OBS 4368).
describe('note/currency-matches-affected-receipt (OBS 4368)', () => {
  const affected = aRecordOf(aReceipt(), 45);
  const customer = { dni: '12345678', name: 'Juan Pérez' };

  test('says nothing when the currency matches', () => {
    expect(
      warningsOf(currencyMatchesAffectedReceipt, aCreditNote({ modifies: affected, customer }), {
        affected,
      }),
    ).toEqual([]);
  });

  test('only warns, and does not block, when the currency differs', () => {
    const note = aCreditNote({ modifies: affected, customer, currency: Currency.Usd });
    expect(errorsOf(currencyMatchesAffectedReceipt, note, { affected })).toEqual([]);
    expect(warningsOf(currencyMatchesAffectedReceipt, note, { affected })[0]).toMatchObject({
      code: '4368',
    });
  });
});
