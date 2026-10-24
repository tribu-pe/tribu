import { describe, expect, test } from 'vitest';
import { aCreditNote } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { affectedIdFormat } from './affected-id-format';

// nota-credito-2.0.csv: the modified invoice's id must match [F][A-Z0-9]{3}-[0-9]{1,8}, a receipt's
// [B][A-Z0-9]{3}-[0-9]{1,8} (ERROR 2117).
describe('note/affected-id-format (ERR 2117)', () => {
  test('accepts a well-formed invoice id', () => {
    expect(errorsOf(affectedIdFormat, aCreditNote({ modifies: 'F001-123' }))).toEqual([]);
  });

  test('rejects a malformed id', () => {
    expect(errorsOf(affectedIdFormat, aCreditNote({ modifies: 'F01-123' }))[0]).toMatchObject({
      code: '2117',
      path: 'modifies',
    });
  });
});
