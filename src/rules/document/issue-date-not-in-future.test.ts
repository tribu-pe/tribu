import { describe, expect, test } from 'vitest';
import { anInvoice, aReceipt } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { issueDateNotInFuture } from './issue-date-not-in-future';

// Validation workbook: IssueDate more than 2 days after the sending date → ERROR 2329.
describe('document/issue-date-not-in-future (ERR 2329)', () => {
  test('accepts an issue date up to 2 days ahead', () => {
    expect(
      errorsOf(issueDateNotInFuture, anInvoice({ issueDate: '2026-10-25' }), {
        today: '2026-10-23',
      }),
    ).toEqual([]);
  });

  test('rejects an issue date 3 days ahead', () => {
    const [issue] = errorsOf(issueDateNotInFuture, anInvoice({ issueDate: '2026-10-26' }), {
      today: '2026-10-23',
    });
    expect(issue).toMatchObject({ code: '2329', path: 'issueDate' });
  });

  test('applies to receipts as well', () => {
    expect(
      errorsOf(issueDateNotInFuture, aReceipt({ issueDate: '2026-10-26' }), {
        today: '2026-10-23',
      }),
    ).toHaveLength(1);
  });
});
