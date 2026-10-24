import { describe, expect, test } from 'vitest';
import { aCreditNote, anInvoice, aRecordOf } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { Status } from '../../results/status';
import { affectedNotRejected } from './affected-not-rejected';

// nota-credito-2.0.csv: the modified document must not be rejected (ERROR 2121).
describe('note/affected-not-rejected (ERR 2121)', () => {
  test('rejects a note that modifies a rejected invoice', () => {
    const affected = aRecordOf(anInvoice(), 123, Status.Rejected);
    expect(
      errorsOf(affectedNotRejected, aCreditNote({ modifies: affected }), { affected })[0],
    ).toMatchObject({
      code: '2121',
      path: 'modifies',
    });
  });

  test('accepts a note that modifies an accepted invoice', () => {
    const affected = aRecordOf(anInvoice(), 123, Status.Accepted);
    expect(
      errorsOf(affectedNotRejected, aCreditNote({ modifies: affected }), { affected }),
    ).toEqual([]);
  });
});
