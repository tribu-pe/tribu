import { describe, test } from 'vitest';
import { CUSTOMER } from '../support/client';
import { betaClient, expectAccepted, freshNumber, keepGolden, outcome } from './support';

// Milestone 0, step 2: a minimal Invoice through the whole path against SUNAT beta.
describe('SUNAT beta: Invoice', () => {
  test('a minimal Invoice is accepted', async () => {
    const input = {
      customer: CUSTOMER,
      items: [{ description: 'Teclado', quantity: 2, price: 118 }],
    };
    const result = await outcome(betaClient().invoice({ ...input, number: freshNumber() }));
    expectAccepted(result);
    keepGolden('invoice', 'minimal', input, result);
  });
});
