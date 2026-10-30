import { describe, expect, test } from 'vitest';
import { Status } from '../../src/index';
import { CUSTOMER } from '../support/client';
import { betaClient, expectAccepted, freshNumber, outcome } from './support';

// The asynchronous path (sendSummary → Ticket → getStatus) against SUNAT beta.
const today = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
const items = [{ description: 'Mouse', quantity: 1, price: 50 }];

describe('SUNAT beta: Daily Summary and Voided Documents', () => {
  test('a Daily Summary reports one Receipt and voids another', async () => {
    const sunat = betaClient();
    const kept = await sunat.receipt({ items, number: freshNumber() }, { send: false });
    const voided = await sunat.receipt({ items, number: freshNumber() }, { send: false });
    const { record } = await sunat.dailySummary({
      date: today(),
      issued: [kept.record],
      voided: [voided.record],
      number: freshNumber() % 100_000,
    });
    const done = await sunat.waitFor(record, { interval: 2_000, timeout: 60_000 });
    expect(done.documents.map((member) => member.status.code)).toEqual([
      Status.Accepted.code,
      Status.Voided.code,
    ]);
  });

  test('Voided Documents cancels an accepted Invoice', async () => {
    const sunat = betaClient();
    const invoice = await outcome(
      sunat.invoice({ customer: CUSTOMER, items, number: freshNumber() }),
    );
    expectAccepted(invoice);
    if (invoice.record === undefined) return;
    const [voiding] = await sunat.voidDocuments({
      documents: [invoice.record],
      reason: 'Error en los datos del cliente',
      number: freshNumber() % 100_000,
    });
    if (voiding === undefined) throw new Error('no Voided Documents record');
    const done = await sunat.waitFor(voiding.record, { interval: 2_000, timeout: 60_000 });
    expect(done.documents[0]?.status.code).toBe(Status.Voided.code);
  });
});
