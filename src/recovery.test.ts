import { afterEach, describe, expect, test, vi } from 'vitest';
import { CUSTOMER, createProductionClient, createTestClient } from '../test/support/client';
import { Recovery } from './options';
import { Status } from './results/status';
import { TribuError } from './results/tribu-error';

const items = [{ description: 'Teclado', quantity: 2, price: 118 }];
const receiptItems = [{ description: 'Mouse', quantity: 1, price: 50 }];

async function caught(promise: Promise<unknown>): Promise<TribuError> {
  const error = await promise.catch((reason: unknown) => reason);
  if (error instanceof TribuError) return error;
  throw new Error(`expected a TribuError, got ${String(error)}`);
}

/** Runs a promise to completion while fake timers advance through every scheduled delay. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  const outcome = await settled;
  if ('error' in outcome) throw outcome.error;
  return outcome.value;
}

afterEach(() => {
  vi.useRealTimers();
});

// ADR 0015: retry only what never reached SUNAT; never re-send blindly by default.
describe('a failure before sending: nothing reached SUNAT, retrying is safe', () => {
  test('retries up to 3 attempts, waiting 1 s then 2 s', async () => {
    vi.useFakeTimers();
    const { sunat, fake } = createTestClient(
      {},
      { fail: { 'F001-1': ['before-send', 'before-send'] } },
    );
    const result = settle(sunat.invoice({ customer: CUSTOMER, items, number: 1 }));
    const { record } = await result;
    expect(record.status).toBe(Status.Accepted);
    expect(fake.attempts['F001-1']).toBe(3);
    expect(fake.delaysBetweenAttempts['F001-1']).toEqual([1_000, 2_000]);
  });

  test('every attempt uses the same Number', async () => {
    vi.useFakeTimers();
    const nextNumber = vi.fn(async () => 7);
    const { sunat, fake } = createTestClient(
      { nextNumber },
      { fail: { 'F001-7': ['before-send'] } },
    );
    await settle(sunat.invoice({ customer: CUSTOMER, items }));
    expect(nextNumber).toHaveBeenCalledTimes(1);
    expect(fake.submissions.map((submission) => submission.fileName)).toEqual([
      '20000000001-01-F001-7',
    ]);
  });

  test('attempts and delay are configurable, also as a function', async () => {
    vi.useFakeTimers();
    const { sunat, fake } = createTestClient(
      { retry: { attempts: 3, delay: (attempt: number) => attempt * 5_000 } },
      { fail: { 'F001-1': ['before-send', 'before-send'] } },
    );
    await settle(sunat.invoice({ customer: CUSTOMER, items, number: 1 }));
    expect(fake.delaysBetweenAttempts['F001-1']).toEqual([5_000, 10_000]);
  });

  test('attempts: 0 per call means no automatic retry', async () => {
    const { sunat, fake } = createTestClient({}, { fail: { 'F001-1': ['before-send'] } });
    await caught(
      sunat.invoice({ customer: CUSTOMER, items, number: 1 }, { retry: { attempts: 0 } }),
    );
    expect(fake.attempts['F001-1']).toBe(1);
  });

  test.todo(
    'the error kind when every pre-send attempt fails: SUNAT was never reached (decision pending)',
  );
});

describe('a failure after sending: SUNAT may already have it', () => {
  test('an invoice in production is looked up, not re-sent', async () => {
    const { sunat, fake } = createProductionClient(
      {},
      { fail: { 'F001-1': ['after-send'] }, lookup: { 'F001-1': 'accepted' } },
    );
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 1 });
    expect(record.status).toBe(Status.Accepted);
    expect(fake.lookups).toEqual(['F001-1']);
    expect(fake.attempts['F001-1']).toBe(1);
  });

  test('if the lookup finds nothing, the same file is sent again', async () => {
    const { sunat, fake } = createProductionClient(
      {},
      { fail: { 'F001-2': ['after-send'] }, lookup: { 'F001-2': 'not-found' } },
    );
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 2 });
    expect(record.status).toBe(Status.Accepted);
    expect(fake.attempts['F001-2']).toBe(2);
  });

  test('in beta there is no lookup: it stops as Unconfirmed instead of re-sending', async () => {
    const { sunat, fake } = createTestClient({}, { fail: { 'F001-3': ['after-send'] } });
    const error = await caught(sunat.invoice({ customer: CUSTOMER, items, number: 3 }));
    expect(error.kind).toBe('unconfirmed');
    expect(error.record?.status).toBe(Status.Unconfirmed);
    expect(fake.attempts['F001-3']).toBe(1);
  });

  test('a receipt cannot be looked up: it stops and offers both ways out', async () => {
    const { sunat, fake } = createProductionClient({}, { fail: { 'B001-1': ['after-send'] } });
    const error = await caught(sunat.receipt({ items: receiptItems, number: 1 }));
    expect(error.kind).toBe('unconfirmed');
    expect(error.issues[0]?.fix).toMatch(/Recovery\.Resend/);
    expect(error.issues[0]?.fix).toMatch(/dailySummary/);
    expect(fake.lookups).toEqual([]);
    expect(fake.attempts['B001-1']).toBe(1);
  });

  test('Recovery.Resend for receipts re-sends the same file', async () => {
    const { sunat, fake } = createProductionClient(
      { recovery: { receipt: Recovery.Resend } },
      { fail: { 'B001-2': ['after-send'] } },
    );
    const { record } = await sunat.receipt({ items: receiptItems, number: 2 });
    expect(record.status).toBe(Status.Accepted);
    expect(fake.submissions.map((submission) => submission.fileName)).toEqual([
      '20000000001-03-B001-2',
      '20000000001-03-B001-2',
    ]);
  });

  test('the answer times out after 30 s by default', async () => {
    vi.useFakeTimers();
    const { sunat } = createTestClient({}, { hang: ['F001-4'] });
    const error = await caught(settle(sunat.invoice({ customer: CUSTOMER, items, number: 4 })));
    expect(error.kind).toBe('unconfirmed');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('a later sunat.retry(record) follows the same strategy', async () => {
    const { sunat, fake } = createProductionClient({}, { fail: { 'B001-5': ['after-send'] } });
    const error = await caught(sunat.receipt({ items: receiptItems, number: 5 }));
    const unconfirmed = error.record;
    if (unconfirmed === undefined) throw new Error('the error must carry the Record');
    const { record } = await sunat.retry(unconfirmed, { recovery: Recovery.Resend });
    expect(record.status).toBe(Status.Accepted);
    expect(fake.attempts['B001-5']).toBe(2);
  });

  // Milestone 0, question 6: beta answered an identical re-send with a second acceptance, no
  // duplicate code (test/beta/questions.test.ts). Production is unverified, so Confirm stays the default.
});
