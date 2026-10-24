import { describe, expect, test } from 'vitest';
import { anInvoice, aReceipt } from '../../test/support/documents';
import { qrText } from './qr';

// R.S. 357-2015 Annex C: RUC | TYPE | SERIES | NUMBER | TOTAL IGV | TOTAL | ISSUE DATE |
// CUSTOMER DOC TYPE | CUSTOMER DOC NUMBER |, with the XML's formats and a trailing pipe.
// The signature hash is not part of it (only the PDF417 had it, invalid since 2020).
describe('qrText', () => {
  test('an invoice', () => {
    const invoice = { ...anInvoice({ issueDate: '2026-10-23' }), number: 123 };
    expect(qrText(invoice)).toBe('20000000001|01|F001|123|36.00|236.00|2026-10-23|6|20123456786|');
  });

  test('a receipt to a DNI', () => {
    const receipt = { ...aReceipt({ issueDate: '2026-10-23' }), number: 45 };
    expect(qrText(receipt)).toBe('20000000001|03|B001|45|7.63|50.00|2026-10-23|1|12345678|');
  });

  test('does not include the signature hash', () => {
    const invoice = { ...anInvoice(), number: 1 };
    expect(qrText(invoice).split('|')).toHaveLength(10); // 9 fields + the empty string after the trailing pipe
  });

  test.todo('an Anonymous Customer: coding to be confirmed in Milestone 0 (question 2)');
});
