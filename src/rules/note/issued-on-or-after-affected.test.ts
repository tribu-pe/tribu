import { describe, expect, test } from 'vitest';
import { aCreditNote, anInvoice, aRecordOf } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { issuedOnOrAfterAffected } from './issued-on-or-after-affected';

// nota-credito-2.0.csv: the note's issue date must be on or after the modified document's (ERROR 2885).
describe('note/issued-on-or-after-affected (ERR 2885)', () => {
  const affected = aRecordOf(anInvoice({ issueDate: '2026-10-20' }), 123);

  test('accepts a note issued the same day', () => {
    const note = aCreditNote(
      { modifies: affected, issueDate: '2026-10-20' },
      { today: '2026-10-20' },
    );
    expect(errorsOf(issuedOnOrAfterAffected, note, { affected })).toEqual([]);
  });

  test('rejects a note issued before the document it modifies', () => {
    const note = aCreditNote(
      { modifies: affected, issueDate: '2026-10-19' },
      { today: '2026-10-20' },
    );
    expect(errorsOf(issuedOnOrAfterAffected, note, { affected })[0]).toMatchObject({
      code: '2885',
      path: 'issueDate',
    });
  });

  test('cannot check it when only the id is known', () => {
    expect(errorsOf(issuedOnOrAfterAffected, aCreditNote({ modifies: 'F001-123' }))).toEqual([]);
  });
});
