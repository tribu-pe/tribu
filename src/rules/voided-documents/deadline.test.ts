import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { deadline } from './deadline';

// SUNAT's validator counts 7 calendar days from the issue date (ERROR 2957), even though the legal text
// until 2026-12-31 counts from the CDR. From 2027-01-01 both agree (R.S. 000048-2026 art. 9).
// docs/research/sunat-facts-2026-10.md § Deadlines
describe('voided-documents/deadline (ERR 2957)', () => {
  const invoice = anInvoice({ issueDate: '2026-10-23' });

  test('accepts voiding on the 7th day after issue', () => {
    expect(errorsOf(deadline, invoice, { today: '2026-10-30', channel: 'voiding' })).toEqual([]);
  });

  test('rejects voiding on the 8th day and suggests a credit note instead', () => {
    const [issue] = errorsOf(deadline, invoice, { today: '2026-10-31', channel: 'voiding' });
    expect(issue).toMatchObject({ code: '2957', path: 'issueDate' });
    expect(issue?.fix).toMatch(/creditNote/);
    expect(issue?.fix).toMatch(/Reason\.Void/);
  });
});
