import { describe, test } from 'vitest';
import { Detraccion } from '../../src/index';
import { CUSTOMER, ISSUER } from '../support/client';
import { betaClient, expectAccepted, freshNumber, outcome } from './support';

// docs/research/detracciones-2026-10.md; ADR 0020. The account is made up: whether SUNAT checks it
// is one of the questions this run answers (unconfirmed item 3).
const issuer = { ...ISSUER, detraccionAccount: '00-000-123456' };
const items = [{ description: 'Mantenimiento de equipos', quantity: 1, price: 1180 }];

describe('SUNAT beta: Invoice with a detracción', () => {
  test('cash: operation type 1001, legend 2006, account, code 020 at 12%', async () => {
    const result = await outcome(
      betaClient({ issuer }).invoice({
        customer: CUSTOMER,
        items,
        detraccion: Detraccion.Maintenance,
        number: freshNumber(),
      }),
    );
    expectAccepted(result);
  });

  test('credit: the amount pending and the Installments exclude the detracción', async () => {
    const result = await outcome(
      betaClient({ issuer }).invoice({
        customer: CUSTOMER,
        items,
        detraccion: Detraccion.Maintenance,
        payment: { installments: [{ amount: '1038.40', due: '2026-12-31' }] },
        number: freshNumber(),
      }),
    );
    expectAccepted(result);
  });
});
