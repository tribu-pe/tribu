import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { sendDeadline } from './send-deadline';

// R.S. 097-2012 art. 12.1 c), text from R.S. 000003-2023: the issue date or up to 3 calendar
// days counted from the day after. Late: ERROR 2108 "Presentacion fuera de fecha".
describe('invoice/send-deadline (ERR 2108)', () => {
  test.each([
    ['2026-10-23', 'the issue date'],
    ['2026-10-26', 'the 3rd calendar day after issue'],
  ])('accepts sending on %s (%s)', (today) => {
    expect(errorsOf(sendDeadline, anInvoice({ issueDate: '2026-10-23' }), { today })).toEqual([]);
  });

  test('rejects sending on the 4th calendar day after issue', () => {
    const [issue] = errorsOf(sendDeadline, anInvoice({ issueDate: '2026-10-23' }), {
      today: '2026-10-27',
    });
    expect(issue).toMatchObject({ code: '2108', path: 'issueDate' });
  });

  test('counts calendar days across a month end', () => {
    expect(
      errorsOf(sendDeadline, anInvoice({ issueDate: '2026-10-30' }), { today: '2026-11-02' }),
    ).toEqual([]);
    expect(
      errorsOf(sendDeadline, anInvoice({ issueDate: '2026-10-30' }), { today: '2026-11-03' }),
    ).toHaveLength(1);
  });
});
