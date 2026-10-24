import { describe, expect, test } from 'vitest';
import { CUSTOMER, createTestClient } from '../../test/support/client';
import { Status } from '../results/status';
import { TribuError } from '../results/tribu-error';

const items = [{ description: 'Teclado', quantity: 2, price: 118 }];

// tribu/testing is public: integrators test their own code against it (ADR 0017).
describe('fakeSunat', () => {
  test('accepts by default and records what it received', async () => {
    const { sunat, fake } = createTestClient();
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 1 });
    expect(record.status).toBe(Status.Accepted);
    expect(fake.submissions).toHaveLength(1);
    expect(fake.submissions[0]).toMatchObject({
      fileName: '20000000001-01-F001-1',
      username: '20000000001MODDATOS',
    });
  });

  test('never exposes the SOL password', async () => {
    const { sunat, fake } = createTestClient({
      sol: { user: 'MODDATOS', password: 'pw-not-to-leak' },
    });
    await sunat.invoice({ customer: CUSTOMER, items, number: 1 });
    expect(JSON.stringify(fake.submissions)).not.toContain('pw-not-to-leak');
    expect(fake.submissions[0]).not.toHaveProperty('password');
  });

  test('rejects a document with the code it is given', async () => {
    const { sunat } = createTestClient({}, { reject: { 'F001-13': '2800' } });
    await expect(sunat.invoice({ customer: CUSTOMER, items, number: 13 })).rejects.toMatchObject({
      kind: 'rejected',
      issues: [{ code: '2800' }],
    });
  });

  test('accepts with observations', async () => {
    const { sunat } = createTestClient({}, { observe: { 'F001-14': ['4031'] } });
    const { record } = await sunat.invoice({ customer: CUSTOMER, items, number: 14 });
    expect(record.status).toBe(Status.Accepted);
    expect(record.cdr?.observations.map((observation) => observation.code)).toEqual(['4031']);
  });

  test('throws an exception code without a CDR', async () => {
    const { sunat } = createTestClient({}, { exception: { 'F001-15': '0102' } });
    const error = await sunat
      .invoice({ customer: CUSTOMER, items, number: 15 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TribuError);
    expect((error as TribuError).kind).toBe('exception');
  });

  test('answers tickets with the statuses it is given, in order', async () => {
    const { fake } = createTestClient({}, { tickets: ['98', '98', '0'] });
    const ticket = await fake.sendSummary({
      fileName: '20000000001-RC-20261023-1',
      zip: new Uint8Array(),
    });
    expect((await fake.getStatus(ticket)).statusCode).toBe('98');
    expect((await fake.getStatus(ticket)).statusCode).toBe('98');
    expect((await fake.getStatus(ticket)).statusCode).toBe('0');
  });
});
