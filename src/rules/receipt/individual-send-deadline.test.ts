import { describe, expect, test } from 'vitest';
import { aReceipt } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { individualSendDeadline } from './individual-send-deadline';

// R.S. 097-2012 art. 7.3, text from R.S. 114-2019: a Receipt may be sent on its own up to 5
// calendar days after issue; later only in a Daily Summary (ERROR 1079).
describe('receipt/individual-send-deadline (ERR 1079)', () => {
  const receipt = aReceipt({ issueDate: '2026-10-23' });

  test('accepts sending individually on the 5th day', () => {
    expect(
      errorsOf(individualSendDeadline, receipt, { today: '2026-10-28', channel: 'individual' }),
    ).toEqual([]);
  });

  test('rejects sending individually on the 6th day and points to the Daily Summary', () => {
    const [issue] = errorsOf(individualSendDeadline, receipt, {
      today: '2026-10-29',
      channel: 'individual',
    });
    expect(issue).toMatchObject({ code: '1079', path: 'issueDate' });
    expect(issue?.fix).toMatch(/dailySummary/);
  });

  test('does not apply when the receipt goes in a Daily Summary', () => {
    expect(
      errorsOf(individualSendDeadline, receipt, { today: '2026-10-29', channel: 'summary' }),
    ).toEqual([]);
  });
});
