import { describe, expect, test } from 'vitest';
import { aCreditNote, anInvoice, aRecordOf } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { Status } from '../../results/status';
import { affectedNotVoided } from './affected-not-voided';

// nota-credito-2.0.csv: the modified document must not be voided (ERROR 2120).
// Tribu can only check it when given the Record, not just the id.
describe('note/affected-not-voided (ERR 2120)', () => {
  test('rejects a note that modifies a voided invoice', () => {
    const affected = aRecordOf(anInvoice(), 123, Status.Voided);
    expect(
      errorsOf(affectedNotVoided, aCreditNote({ modifies: affected }), { affected })[0],
    ).toMatchObject({
      code: '2120',
      path: 'modifies',
    });
  });

  test('accepts a note that modifies an accepted invoice', () => {
    const affected = aRecordOf(anInvoice(), 123, Status.Accepted);
    expect(errorsOf(affectedNotVoided, aCreditNote({ modifies: affected }), { affected })).toEqual(
      [],
    );
  });
});
