import { describe, expect, test } from 'vitest';
import { anInvoice, aReceipt } from '../../test/support/documents';
import { dailySummaryFileName, documentFileName, voidedDocumentsFileName } from './file-name';

// Annex VI of R.S. 114-2019: RUC-TYPE-SERIES-NUMBER for documents, RUC-RC-YYYYMMDD-n for Daily
// Summaries, RUC-RA-YYYYMMDD-n for Voided Documents. The XML number must match the file (ERR 1035, 1036).
describe('file names', () => {
  test('an invoice', () => {
    expect(documentFileName('20000000001', { ...anInvoice(), number: 123 })).toBe(
      '20000000001-01-F001-123',
    );
  });

  test('a receipt', () => {
    expect(documentFileName('20000000001', { ...aReceipt(), number: 45 })).toBe(
      '20000000001-03-B001-45',
    );
  });

  test('a Daily Summary', () => {
    expect(dailySummaryFileName('20000000001', '2026-10-23', 1)).toBe('20000000001-RC-20261023-1');
  });

  test('Voided Documents', () => {
    expect(voidedDocumentsFileName('20000000001', '2026-10-23', 2)).toBe(
      '20000000001-RA-20261023-2',
    );
  });
});
