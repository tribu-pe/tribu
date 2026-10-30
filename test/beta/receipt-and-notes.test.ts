import { describe, test } from 'vitest';
import { Reason as CreditReason } from '../../src/catalogs/documents/credit-note';
import { Reason as DebitReason } from '../../src/catalogs/documents/debit-note';
import { CUSTOMER } from '../support/client';
import { betaClient, expectAccepted, freshNumber, keepGolden, outcome } from './support';

// Milestone 0, step 3: a Receipt sent individually and the notes, against SUNAT beta.
const keyboard = [{ description: 'Teclado', quantity: 2, price: 118 }];
const mouse = [{ description: 'Mouse', quantity: 1, price: 50 }];
const dni = { dni: '12345678', name: 'Juan Pérez' };

describe('SUNAT beta: Receipt', () => {
  test('a Receipt without a Customer is accepted (question 2)', async () => {
    const input = { items: mouse };
    const result = await outcome(betaClient().receipt({ ...input, number: freshNumber() }));
    expectAccepted(result);
    keepGolden('receipt', 'anonymous', input, result);
  });

  test('a Receipt to a DNI is accepted', async () => {
    const input = { customer: dni, items: mouse };
    const result = await outcome(betaClient().receipt({ ...input, number: freshNumber() }));
    expectAccepted(result);
    keepGolden('receipt', 'dni', input, result);
  });
});

describe('SUNAT beta: notes', () => {
  test('a Credit Note voiding an accepted Invoice, from its Record, is accepted', async () => {
    const sunat = betaClient();
    const invoice = await outcome(
      sunat.invoice({ customer: CUSTOMER, items: keyboard, number: freshNumber() }),
    );
    expectAccepted(invoice);
    if (invoice.record === undefined) return;
    expectAccepted(
      await outcome(
        sunat.creditNote({
          modifies: invoice.record,
          reason: CreditReason.Void,
          number: freshNumber(),
        }),
      ),
    );
  });

  test('a Credit Note returning one Item is accepted', async () => {
    const sunat = betaClient();
    const invoice = await outcome(
      sunat.invoice({ customer: CUSTOMER, items: keyboard, number: freshNumber() }),
    );
    expectAccepted(invoice);
    if (invoice.record === undefined) return;
    const input = {
      modifies: invoice.record.id,
      reason: CreditReason.Item.Return,
      customer: CUSTOMER,
      items: [{ description: 'Teclado', quantity: 1, price: 118 }],
    };
    const result = await outcome(sunat.creditNote({ ...input, number: freshNumber() }));
    expectAccepted(result);
    keepGolden('credit-note', 'item-return', input, result);
  });

  test('a Credit Note on a Receipt is accepted', async () => {
    const sunat = betaClient();
    const receipt = await outcome(
      sunat.receipt({ customer: dni, items: mouse, number: freshNumber() }),
    );
    expectAccepted(receipt);
    if (receipt.record === undefined) return;
    const input = {
      modifies: receipt.record.id,
      reason: CreditReason.Void,
      customer: dni,
      items: mouse,
    };
    const result = await outcome(sunat.creditNote({ ...input, number: freshNumber() }));
    expectAccepted(result);
    keepGolden('credit-note', 'receipt-void', input, result);
  });

  test('a Debit Note charging interest is accepted', async () => {
    const sunat = betaClient();
    const invoice = await outcome(
      sunat.invoice({ customer: CUSTOMER, items: keyboard, number: freshNumber() }),
    );
    expectAccepted(invoice);
    if (invoice.record === undefined) return;
    const input = {
      modifies: invoice.record.id,
      reason: DebitReason.Interest,
      customer: CUSTOMER,
      items: [{ description: 'Intereses por mora', quantity: 1, price: 11.8 }],
    };
    const result = await outcome(sunat.debitNote({ ...input, number: freshNumber() }));
    expectAccepted(result);
    keepGolden('debit-note', 'interest', input, result);
  });
});
