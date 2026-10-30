import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createTestClient } from '../test/support/client';
import { parseXml, text } from '../test/support/xml';
import { DocumentType, Unit } from './catalogs/index';
import { Status } from './results/status';
import type { TribuError } from './results/tribu-error';
import { fakeSunat } from './testing/index';
import { readCdr } from './transport/read';

const receiptItems = [{ description: 'Mouse', quantity: 1, price: 50 }];

function today(date: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${date}T15:00:00Z`));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Daily Summary and Voided Documents dates (ERR 2346)', () => {
  test('a summary sent the next day names itself after the generation date', async () => {
    today('2026-10-23');
    const { sunat, fake } = createTestClient({}, { tickets: ['0'] });
    const { record: receipt } = await sunat.receipt(
      { items: receiptItems, number: 1 },
      { send: false },
    );

    today('2026-10-24');
    const { record } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [receipt],
      number: 1,
    });

    expect(record.id).toBe('RC-20261024-1');
    expect(fake.submissions[0]?.fileName).toBe('20000000001-RC-20261024-1');
    const root = parseXml(record.xml ?? '');
    expect(text(root, 'cbc:IssueDate')).toBe('2026-10-24');
    expect(text(root, 'cbc:ReferenceDate')).toBe('2026-10-23');
  });

  test('a voiding sent the next day names itself after the generation date', async () => {
    today('2026-10-23');
    const { sunat, fake } = createTestClient({}, { tickets: ['0'] });
    const { record: invoice } = await sunat.invoice({
      customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
      items: receiptItems,
      number: 1,
      issueDate: '2026-10-23',
    });

    today('2026-10-24');
    const [voiding] = await sunat.voidDocuments({
      documents: [invoice],
      reason: 'Error',
      number: 1,
    });

    expect(voiding?.record.id).toBe('RA-20261024-1');
    expect(fake.submissions.at(-1)?.fileName).toBe('20000000001-RA-20261024-1');
  });
});

describe('waitFor', () => {
  test('marks the voided lines of a summary as Voided, not Accepted', async () => {
    today('2026-10-23');
    const { sunat } = createTestClient({}, { tickets: ['0'] });
    const { record: issued } = await sunat.receipt(
      { items: receiptItems, number: 1 },
      { send: false },
    );
    const { record: voided } = await sunat.receipt(
      { items: receiptItems, number: 2 },
      { send: false },
    );
    const { record: summary } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [issued],
      voided: [voided],
      number: 1,
    });

    const done = await sunat.waitFor(summary, { interval: 0 });
    expect(done.documents.map((member) => [member.id, member.status])).toEqual([
      ['B001-1', Status.Accepted],
      ['B001-2', Status.Voided],
    ]);
  });

  test('a ticket with errors reads the CDR before rejecting', async () => {
    today('2026-10-23');
    const fake = fakeSunat({ tickets: ['99'] });
    const cdr = readCdr(
      readFileSync(new URL('../fixtures/sunat/cdr-rejected.xml', import.meta.url), 'utf8'),
    );
    const transport = { ...fake, getStatus: async () => ({ statusCode: '99', cdr }) };
    const { sunat } = createTestClient({ transport });
    const { record: receipt } = await sunat.receipt(
      { items: receiptItems, number: 1 },
      { send: false },
    );
    const { record: summary } = await sunat.dailySummary({
      date: '2026-10-23',
      issued: [receipt],
      number: 1,
    });

    const error = (await sunat
      .waitFor(summary, { interval: 0 })
      .catch((reason: unknown) => reason)) as TribuError;
    expect(error).toMatchObject({ kind: 'rejected' });
    expect(error.record?.cdr?.code).toBe('2047');
  });
});

describe('preview and validate take the Document Type', () => {
  const dniCustomer = { dni: '12345678', name: 'Juan Pérez' };

  test('validate on a Receipt accepts a DNI customer', async () => {
    const { sunat } = createTestClient();
    await expect(
      sunat.validate({ customer: dniCustomer, items: receiptItems }, DocumentType.Receipt),
    ).resolves.toBeUndefined();
  });

  test('validate on an Invoice still refuses it', async () => {
    const { sunat } = createTestClient();
    await expect(
      sunat.validate({ customer: dniCustomer, items: receiptItems }),
    ).rejects.toMatchObject({ kind: 'validation' });
  });

  test('preview on a Receipt calculates a Receipt', () => {
    const { sunat } = createTestClient();
    expect(
      sunat.preview({ customer: dniCustomer, items: receiptItems }, DocumentType.Receipt).type.code,
    ).toBe('03');
  });

  test('only a Document Type is accepted, not any catalog entry (ADR 0017)', () => {
    const { sunat } = createTestClient();
    const compileOnly = () => {
      // @ts-expect-error Unit.Goods is not a DocumentType
      sunat.preview({ items: receiptItems }, Unit.Goods);
    };
    expect(typeof compileOnly).toBe('function');
  });
});
