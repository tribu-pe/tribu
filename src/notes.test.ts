import { describe, expect, test } from 'vitest';
import { CUSTOMER, createTestClient } from '../test/support/client';
import { parseXml, text } from '../test/support/xml';
import { Reason as CreditReason } from './catalogs/documents/credit-note';
import { Reason as DebitReason } from './catalogs/documents/debit-note';
import { Status } from './results/status';
import { TribuError } from './results/tribu-error';

const items = [{ description: 'Teclado', quantity: 2, price: 118 }];

async function issuedInvoice() {
  const client = createTestClient();
  const { record } = await client.sunat.invoice({ customer: CUSTOMER, items, number: 123 });
  return { ...client, invoice: record };
}

describe('sunat.creditNote', () => {
  test('voids a whole invoice in one line, copying its customer, currency and items', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const { record } = await sunat.creditNote({
      modifies: invoice,
      reason: CreditReason.Void,
      number: 1,
    });
    expect(record.id).toBe('FC01-1');
    expect(record.status).toBe(Status.Accepted);
    expect(record.document.customer.name).toBe('CLIENTE SAC');
    expect(record.document.totals.payable.toFixed(2)).toBe('236.00');
    expect(text(parseXml(record.xml), 'cac:DiscrepancyResponse/cbc:ResponseCode')).toBe('01');
  });

  test('accepts a Record restored from JSON (ADR 0008)', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const restored = JSON.parse(JSON.stringify(invoice));
    const { record } = await sunat.creditNote({
      modifies: restored,
      reason: CreditReason.Void,
      number: 2,
    });
    expect(record.status).toBe(Status.Accepted);
  });

  test('a partial return lists what is returned', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const { record } = await sunat.creditNote({
      modifies: invoice,
      reason: CreditReason.Item.Return,
      items: [{ description: 'Teclado', quantity: 1, price: 118 }],
      number: 3,
    });
    expect(record.document.totals.payable.toFixed(2)).toBe('118.00');
  });

  test('a note on a receipt uses the receipt-note series', async () => {
    const { sunat } = createTestClient();
    const { record: receipt } = await sunat.receipt({
      customer: { dni: '12345678', name: 'Juan Pérez' },
      items,
      number: 45,
    });
    const { record } = await sunat.creditNote({
      modifies: receipt,
      reason: CreditReason.Void,
      number: 1,
    });
    expect(record.id).toBe('BC01-1');
  });

  test('with only an id it needs the customer and items, and cannot check the original', async () => {
    const { sunat } = createTestClient();
    await expect(
      sunat.creditNote({ modifies: 'F001-123', reason: CreditReason.Void, number: 4 }),
    ).rejects.toMatchObject({
      kind: 'validation',
    });
    const { record } = await sunat.creditNote({
      modifies: 'F001-123',
      reason: CreditReason.Item.Return,
      customer: CUSTOMER,
      items: [{ description: 'Teclado', quantity: 1, price: 118 }],
      number: 5,
    });
    expect(record.status).toBe(Status.Accepted);
  });

  test('a debit Reason is refused, even though both catalogs use the code 01 (ADR 0005)', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const error = await sunat
      // @ts-expect-error a catalog 10 Reason is not a credit note Reason
      .creditNote({ modifies: invoice, reason: DebitReason.Interest, number: 6 })
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(TribuError);
    expect((error as TribuError).issues[0]?.path).toBe('reason');
  });

  test('a voided invoice cannot be modified (ERR 2120)', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const voided = { ...invoice, status: Status.Voided };
    await expect(
      sunat.creditNote({ modifies: voided, reason: CreditReason.Void, number: 7 }),
    ).rejects.toMatchObject({
      issues: [{ code: '2120' }],
    });
  });

  test('a credit note cannot exceed the invoice (ERR 3286)', async () => {
    const { sunat, invoice } = await issuedInvoice();
    await expect(
      sunat.creditNote({
        modifies: invoice,
        reason: CreditReason.Item.Return,
        items: [{ description: 'Teclado', quantity: 3, price: 118 }],
        number: 8,
      }),
    ).rejects.toMatchObject({ issues: [{ code: '3286' }] });
  });
});

describe('sunat.debitNote', () => {
  test('adds interest to an invoice', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const { record } = await sunat.debitNote({
      modifies: invoice,
      reason: DebitReason.Interest,
      items: [{ description: 'Intereses por mora', quantity: 1, price: 25 }],
      number: 1,
    });
    expect(record.id).toBe('FD01-1');
    expect(parseXml(record.xml).tagName).toBe('DebitNote');
  });

  test('a credit Reason is refused', async () => {
    const { sunat, invoice } = await issuedInvoice();
    const error = await sunat
      // @ts-expect-error a catalog 09 Reason is not a debit note Reason
      .debitNote({ modifies: invoice, reason: CreditReason.Void, items, number: 2 })
      .catch((reason: unknown) => reason);
    expect((error as TribuError).issues[0]?.path).toBe('reason');
  });
});
