import { describe, expect, test } from 'vitest';
import { aReceipt } from '../../../test/support/documents';
import { errorsOf, warningsOf } from '../../../test/support/rules';
import { sendDeadline } from './send-deadline';

// R.S. 097-2012 art. 21.1 b): a Receipt goes in a Daily Summary by the 7th calendar day after issue.
// Late, SUNAT only observes it (OBS 4443), so Tribu warns and still sends (ADR 0011).
describe('daily-summary/send-deadline (OBS 4443)', () => {
  const receipt = aReceipt({ issueDate: '2026-10-23' });

  test('says nothing on the 7th day', () => {
    expect(warningsOf(sendDeadline, receipt, { today: '2026-10-30', channel: 'summary' })).toEqual(
      [],
    );
  });

  test('warns, without blocking, on the 8th day', () => {
    expect(errorsOf(sendDeadline, receipt, { today: '2026-10-31', channel: 'summary' })).toEqual(
      [],
    );
    expect(
      warningsOf(sendDeadline, receipt, { today: '2026-10-31', channel: 'summary' })[0],
    ).toMatchObject({
      code: '4443',
    });
  });
});
