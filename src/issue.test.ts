import { afterEach, describe, expect, test, vi } from 'vitest';
import { CUSTOMER, createTestClient } from '../test/support/client';
import { parseXml, text } from '../test/support/xml';
import { Status } from './results/status';
import { TribuError } from './results/tribu-error';

const items = [{ description: 'Teclado', quantity: 2, price: 118 }];

async function caught(promise: Promise<unknown>): Promise<TribuError> {
  const error = await promise.catch((reason: unknown) => reason);
  if (error instanceof TribuError) return error;
  throw new Error(`expected a TribuError, got ${String(error)}`);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('sunat.invoice: the happy path', () => {
  test('returns a Record with everything the Issuer must keep (ADR 0008)', async () => {
    const { sunat } = createTestClient();
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 123 });
    expect(record).toMatchObject({ id: 'F001-123', status: Status.Accepted });
    expect(record.document.totals.payable.toFixed(2)).toBe('236.00');
    expect(record.xml).toContain('ds:Signature');
    expect(record.cdr?.code).toBe('0');
    expect(record.qr).toMatch(/^20000000001\|01\|F001\|123\|36\.00\|236\.00\|/);
    expect(record.hash.length).toBeGreaterThan(0);
  });

  test('the Record is plain JSON that comes back intact', async () => {
    const { sunat } = createTestClient();
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 123 });
    const restored = JSON.parse(JSON.stringify(record));
    expect(restored.id).toBe('F001-123');
    expect(restored.status).toEqual(JSON.parse(JSON.stringify(Status.Accepted)));
  });

  test('the issue date defaults to today in Lima, not the server clock', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-24T03:30:00Z')); // 22:30 on the 23rd in Lima (UTC-5)
    const { sunat } = createTestClient();
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 1 });
    expect(record.document.issueDate).toBe('2026-10-23');
    expect(text(parseXml(record.xml), 'cbc:IssueDate')).toBe('2026-10-23');
  });

  test('preview() calculates without sending', async () => {
    const { sunat, fake } = createTestClient();
    const document = await sunat.preview({ customer: CUSTOMER, items });
    expect(document.totals.payable.toFixed(2)).toBe('236.00');
    expect(fake.submissions).toHaveLength(0);
  });

  test('validate() checks the Rules without sending', async () => {
    const { sunat, fake } = createTestClient();
    await expect(
      sunat.validate({ customer: { dni: '12345678', name: 'Juan Pérez' }, items }),
    ).rejects.toMatchObject({
      kind: 'validation',
    });
    expect(fake.submissions).toHaveLength(0);
  });
});

describe('sunat.invoice: the Number', () => {
  test('uses an explicit number', async () => {
    const { sunat } = createTestClient();
    expect((await sunat.invoice({ customer: CUSTOMER, items, number: 77 })).record.id).toBe(
      'F001-77',
    );
  });

  test('asks nextNumber for the series', async () => {
    const nextNumber = vi.fn(async () => 124);
    const { sunat } = createTestClient({ nextNumber });
    const { record } = await sunat.invoice({ customer: CUSTOMER, items });
    expect(nextNumber).toHaveBeenCalledWith('F001');
    expect(record.id).toBe('F001-124');
  });

  test('never reserves a Number for a document that fails validation (ADR 0003)', async () => {
    const nextNumber = vi.fn(async () => 125);
    const { sunat } = createTestClient({ nextNumber });
    await caught(sunat.invoice({ customer: { dni: '12345678', name: 'Juan Pérez' }, items }));
    expect(nextNumber).not.toHaveBeenCalled();
  });

  test('without number or nextNumber it fails clearly, never guessing', async () => {
    const { sunat } = createTestClient();
    const error = await caught(sunat.invoice({ customer: CUSTOMER, items }));
    expect(error.kind).toBe('validation');
    expect(error.issues[0]?.path).toBe('number');
    expect(error.issues[0]?.fix).toMatch(/nextNumber/);
  });
});

describe('sunat.invoice: when something goes wrong', () => {
  test('a local Rule failure throws validation and sends nothing', async () => {
    const { sunat, fake } = createTestClient();
    const error = await caught(
      sunat.invoice({ customer: { dni: '12345678', name: 'Juan Pérez' }, items, number: 1 }),
    );
    expect(error.kind).toBe('validation');
    expect(error.issues[0]).toMatchObject({ code: '2800' });
    expect(fake.submissions).toHaveLength(0);
  });

  test('a rejection throws, carries the Record, and the Number stays used', async () => {
    const { sunat } = createTestClient({}, { reject: { 'F001-13': '2800' } });
    const error = await caught(sunat.invoice({ customer: CUSTOMER, items, number: 13 }));
    expect(error.kind).toBe('rejected');
    expect(error.retryable).toBe(false);
    expect(error.record?.status).toBe(Status.Rejected);
  });

  test('an exception leaves the Record Issued: SUNAT did not evaluate it (ADR 0014)', async () => {
    const { sunat } = createTestClient({}, { exception: { 'F001-14': '0102' } });
    const error = await caught(sunat.invoice({ customer: CUSTOMER, items, number: 14 }));
    expect(error.kind).toBe('exception');
    expect(error.record?.status).toBe(Status.Issued);
    expect(error.message).toMatch(/0102/);
  });

  // Milestone 0: beta rejected content (3030) with a SOAP fault, not a CDR. The code's class
  // decides, so the Number counts as used and the advice is a new document.
  test('a rejection that arrives as a SOAP fault is Rejected, without a CDR (ADR 0014)', async () => {
    const { sunat } = createTestClient({}, { exception: { 'F001-17': '3030' } });
    const error = await caught(sunat.invoice({ customer: CUSTOMER, items, number: 17 }));
    expect(error.kind).toBe('rejected');
    expect(error.record?.status).toBe(Status.Rejected);
    expect(error.record?.cdr).toBeUndefined();
    expect(error.issues[0]?.code).toBe('3030');
    expect(error.issues[0]?.fix).toMatch(/new Number/);
  });

  test('observations are a success, listed in the CDR', async () => {
    const { sunat } = createTestClient({}, { observe: { 'F001-15': ['4031'] } });
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 15 });
    expect(record.status).toBe(Status.Accepted);
    expect(record.cdr?.observations[0]?.code).toBe('4031');
  });

  test('{ throw: false } returns the outcome instead of throwing', async () => {
    const { sunat } = createTestClient({}, { reject: { 'F001-16': '2800' } });
    const result = await sunat.invoice({ customer: CUSTOMER, items, number: 16 }, { throw: false });
    expect(result.record.status).toBe(Status.Rejected);
    expect(result.error?.kind).toBe('rejected');
  });
});

describe('sunat.invoice: escape hatches (ADR 0003)', () => {
  const dniCustomer = { dni: '12345678', name: 'Juan Pérez' };

  test("validate: 'warn' sends anyway and reports the warnings", async () => {
    const { sunat, fake } = createTestClient();
    const result = await sunat.invoice(
      { customer: dniCustomer, items, number: 1 },
      { validate: 'warn', throw: false },
    );
    expect(fake.submissions).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe('2800');
  });

  test('validate: false skips the Rules', async () => {
    const { sunat, fake } = createTestClient();
    await sunat.invoice(
      { customer: dniCustomer, items, number: 1 },
      { validate: false, throw: false },
    );
    expect(fake.submissions).toHaveLength(1);
  });

  test('rules.disable switches off one Rule by id', async () => {
    const { sunat, fake } = createTestClient({ rules: { disable: ['invoice/customer-has-ruc'] } });
    await sunat.invoice({ customer: dniCustomer, items, number: 1 }, { throw: false });
    expect(fake.submissions).toHaveLength(1);
  });
});

describe('sunat.receipt (ADR 0010)', () => {
  const receiptItems = [{ description: 'Mouse', quantity: 1, price: 50 }];

  test('is sent individually by default and accepted at once', async () => {
    const { sunat, fake } = createTestClient();
    const { record } = await sunat.receipt({
      customer: { dni: '12345678', name: 'Juan Pérez' },
      items: receiptItems,
      number: 45,
    });
    expect(record.id).toBe('B001-45');
    expect(record.status).toBe(Status.Accepted);
    expect(fake.submissions[0]?.fileName).toBe('20000000001-03-B001-45');
  });

  test('{ send: false } leaves it Issued for a Daily Summary and sends nothing', async () => {
    const { sunat, fake } = createTestClient();
    const { record } = await sunat.receipt({ items: receiptItems, number: 46 }, { send: false });
    expect(record.status).toBe(Status.Issued);
    expect(record.xml).toContain('ds:Signature');
    expect(fake.submissions).toHaveLength(0);
  });

  test('accepts an Anonymous Customer up to S/ 700', async () => {
    const { sunat } = createTestClient();
    const { record } = await sunat.receipt({ items: receiptItems, number: 47 });
    expect(record.status).toBe(Status.Accepted);
  });

  test('requires the customer above S/ 700 (ERR 2514)', async () => {
    const { sunat } = createTestClient();
    const error = await caught(
      sunat.receipt({
        items: [{ description: 'Televisor', quantity: 1, price: 2500 }],
        number: 48,
      }),
    );
    expect(error.issues[0]?.code).toBe('2514');
  });

  test('an invoice() call with a DNI customer teaches to use receipt()', async () => {
    const { sunat } = createTestClient();
    const error = await caught(
      sunat.invoice({ customer: { dni: '12345678', name: 'Juan Pérez' }, items, number: 1 }),
    );
    expect(error.message).toMatch(/sunat\.receipt/);
  });
});
