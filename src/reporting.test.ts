import { afterEach, describe, expect, test, vi } from 'vitest';
import { CUSTOMER, createTestClient } from '../test/support/client';
import { all, parseXml, text } from '../test/support/xml';
import { Reason } from './catalogs/documents/credit-note';
import { Status } from './results/status';

const receiptItems = [{ description: 'Mouse', quantity: 1, price: 50 }];
const instant = { interval: 0 };

afterEach(() => {
  vi.useRealTimers();
});

function today(date: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${date}T15:00:00Z`));
}

describe('sunat.dailySummary', () => {
  test('reports the day’s receipts and answers with a Ticket', async () => {
    today('2026-10-23');
    const { sunat, fake } = createTestClient({}, { tickets: ['0'] });
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const { record: b2 } = await sunat.receipt({ items: receiptItems, number: 2 }, { send: false });

    const { record } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [b1, b2],
      number: 1,
    });
    expect(record.id).toBe('RC-20261023-1');
    expect(record.status).toBe(Status.Processing);
    expect(record.ticket).toBeTruthy();
    expect(fake.submissions[0]?.fileName).toBe('20000000001-RC-20261023-1');
  });

  test('one line per receipt, status 1 "Adicionar" (catalog 19)', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient();
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const { record } = await sunat.dailySummary({ date: '2026-10-23', issued: [b1], number: 1 });
    const root = parseXml(record.xml);
    expect(root.tagName).toBe('SummaryDocuments');
    // resumen-diario-1.1.csv: UBL 2.0 (ERR 2074), structure 1.1 (ERR 2072).
    expect(text(root, 'cbc:UBLVersionID')).toBe('2.0');
    expect(text(root, 'cbc:CustomizationID')).toBe('1.1');
    expect(text(root, 'cbc:ReferenceDate')).toBe('2026-10-23');
    expect(
      all(root, 'sac:SummaryDocumentsLine/cac:Status/cbc:ConditionCode').map(
        (node) => node.textContent,
      ),
    ).toEqual(['1']);
  });

  test('voids receipts with status 3 "Anulado" (catalog 19)', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient();
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 });
    const { record } = await sunat.dailySummary({ date: '2026-10-23', voided: [b1], number: 2 });
    const codes = all(
      parseXml(record.xml),
      'sac:SummaryDocumentsLine/cac:Status/cbc:ConditionCode',
    );
    expect(codes.map((node) => node.textContent)).toEqual(['3']);
  });

  test('calls onTicket before waiting, so a crash never loses the Ticket', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient({}, { tickets: ['98', '0'] });
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const onTicket = vi.fn();
    const { record } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [b1],
      number: 1,
      onTicket,
    });
    expect(onTicket).toHaveBeenCalledWith(record.ticket);
  });

  test('a late summary only warns (OBS 4443) and is still sent', async () => {
    today('2026-10-31');
    const { sunat, fake } = createTestClient();
    const { record: late } = await sunat.receipt(
      { items: receiptItems, number: 1, issueDate: '2026-10-23' },
      { send: false, validate: false },
    );
    const result = await sunat.dailySummary({ date: '2026-10-23', issued: [late], number: 1 });
    expect(result.warnings.map((warning) => warning.code)).toEqual(['4443']);
    expect(fake.submissions).toHaveLength(1);
  });

  test.todo('splits a summary above the line limit (500 per R.S. 244-2019 annex: to verify)');
});

describe('sunat.waitFor', () => {
  test('queries the Ticket until SUNAT finishes, and returns the updated Records', async () => {
    today('2026-10-23');
    const { sunat, fake } = createTestClient({}, { tickets: ['98', '98', '0'] });
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const { record: summary } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [b1],
      number: 1,
    });

    const done = await sunat.waitFor(summary, instant);
    expect(done.record.status).toBe(Status.Accepted);
    expect(done.documents.map((document) => [document.id, document.status])).toEqual([
      ['B001-1', Status.Accepted],
    ]);
    expect(fake.statusQueries).toBe(3);
  });

  test('never re-sends a submission that has a Ticket (ADR 0015)', async () => {
    today('2026-10-23');
    const { sunat, fake } = createTestClient({}, { tickets: ['98', '0'] });
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const { record: summary } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [b1],
      number: 1,
    });
    await sunat.waitFor(summary, instant);
    expect(fake.submissions).toHaveLength(1);
  });

  test('status 99 "Proceso con errores" is a rejection with its CDR', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient({}, { tickets: ['99'] });
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const { record: summary } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [b1],
      number: 1,
    });
    await expect(sunat.waitFor(summary, instant)).rejects.toMatchObject({ kind: 'rejected' });
  });

  test('gives up after its timeout and leaves the Record Processing', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient({}, { tickets: ['98'] });
    const { record: b1 } = await sunat.receipt({ items: receiptItems, number: 1 }, { send: false });
    const { record: summary } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [b1],
      number: 1,
    });
    await expect(sunat.waitFor(summary, { interval: 0, timeout: 0 })).rejects.toMatchObject({
      kind: 'unconfirmed',
      record: { status: Status.Processing },
    });
  });
});

describe('sunat.voidDocuments', () => {
  test('voids invoices with a Ticket, file RA-YYYYMMDD-n', async () => {
    today('2026-10-23');
    const { sunat, fake } = createTestClient({}, { tickets: ['0'] });
    const { record: invoice } = await sunat.invoice({
      customer: CUSTOMER,
      items: receiptItems,
      number: 1,
    });
    const [voiding] = await sunat.voidDocuments({
      documents: [invoice],
      reason: 'Error en los datos del cliente',
      number: 1,
    });
    expect(voiding?.record.id).toBe('RA-20261023-1');
    expect(fake.submissions.at(-1)?.fileName).toBe('20000000001-RA-20261023-1');
    const root = parseXml(voiding?.record.xml ?? '');
    expect(text(root, 'sac:VoidedDocumentsLine/sac:VoidReasonDescription')).toBe(
      'Error en los datos del cliente',
    );
    expect(text(root, 'sac:VoidedDocumentsLine/sac:DocumentSerialID')).toBe('F001');
    // comunicacion-de-baja-1.0.csv: UBL 2.0 (ERR 2074), structure 1.0 (ERR 2072).
    expect(text(root, 'cbc:UBLVersionID')).toBe('2.0');
    expect(text(root, 'cbc:CustomizationID')).toBe('1.0');
  });

  test('after SUNAT accepts, the invoice Record is Voided', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient({}, { tickets: ['0'] });
    const { record: invoice } = await sunat.invoice({
      customer: CUSTOMER,
      items: receiptItems,
      number: 1,
    });
    const [voiding] = await sunat.voidDocuments({
      documents: [invoice],
      reason: 'Error',
      number: 1,
    });
    const done = await sunat.waitFor(voiding?.record ?? invoice, instant);
    expect(done.documents[0]).toMatchObject({ id: 'F001-1', status: Status.Voided });
  });

  test('groups documents by issue date: one submission per date', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient();
    const { record: a } = await sunat.invoice({
      customer: CUSTOMER,
      items: receiptItems,
      number: 1,
      issueDate: '2026-10-22',
    });
    const { record: b } = await sunat.invoice({
      customer: CUSTOMER,
      items: receiptItems,
      number: 2,
      issueDate: '2026-10-23',
    });
    const voidings = await sunat.voidDocuments({ documents: [a, b], reason: 'Error', number: 1 });
    expect(voidings).toHaveLength(2);
  });

  test('past the 7-day limit it refuses and suggests a credit note (ERR 2957)', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient();
    const { record: invoice } = await sunat.invoice({
      customer: CUSTOMER,
      items: receiptItems,
      number: 1,
    });
    today('2026-10-31');
    await expect(
      sunat.voidDocuments({ documents: [invoice], reason: 'Error', number: 1 }),
    ).rejects.toMatchObject({
      issues: [{ code: '2957' }],
    });
    expect(Reason.Void.code).toBe('01'); // the suggested alternative
  });

  test('receipts are voided in the Daily Summary, not here', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient();
    const { record: receipt } = await sunat.receipt({ items: receiptItems, number: 1 });
    await expect(
      sunat.voidDocuments({ documents: [receipt], reason: 'Error', number: 1 }),
    ).rejects.toThrow(/dailySummary/);
  });
});

describe('receipts older than 5 days', () => {
  test('cannot be sent individually: the error points to the Daily Summary (ERR 1079)', async () => {
    today('2026-10-29');
    const { sunat } = createTestClient();
    await expect(
      sunat.receipt({ items: receiptItems, number: 1, issueDate: '2026-10-23' }),
    ).rejects.toMatchObject({ issues: [{ code: '1079' }] });
  });
});
