import { describe, expect, test } from 'vitest';
import { anInvoice, aReceipt, settings } from '../../test/support/documents';
import { Currency, Detraccion } from '../catalogs/index';
import { TribuError } from '../results/tribu-error';

// docs/research/detracciones-2026-10.md; ADR 0020.
const ACCOUNT = '00-000-123456';
const withAccount = { issuer: { ...settings().issuer, detraccionAccount: ACCOUNT } };
const service = [{ description: 'Mantenimiento de equipos', quantity: 1, price: 1180 }];

function issuesOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof TribuError) return error.issues;
    throw error;
  }
  throw new Error('expected a validation error');
}

describe('calculate: an Invoice with a detracción', () => {
  test('the constant brings the rate: 12% of S/ 1,180.00 (IGV included) is S/ 141.60', () => {
    const invoice = anInvoice({ items: service, detraccion: Detraccion.Maintenance }, withAccount);
    expect(invoice.detraccion?.code.code).toBe('020');
    expect(invoice.detraccion?.rate.toString()).toBe('12');
    expect(invoice.detraccion?.amount.toFixed(2)).toBe('141.60');
    expect(invoice.detraccion?.account).toBe(ACCOUNT);
  });

  test('the total stays whole: the detracción is not a discount', () => {
    const invoice = anInvoice({ items: service, detraccion: Detraccion.Maintenance }, withAccount);
    expect(invoice.totals.payable.toFixed(2)).toBe('1180.00');
  });

  test('on credit, the amount pending is the total less the detracción (R.S. 193-2020, item 64-A)', () => {
    const invoice = anInvoice(
      {
        items: service,
        detraccion: Detraccion.Maintenance,
        payment: { installments: [{ amount: '1038.40', due: '2026-11-30' }] },
      },
      withAccount,
    );
    expect(invoice.payment.terms === 'credit' && invoice.payment.pending.toFixed(2)).toBe(
      '1038.40',
    );
  });

  test('rounds the amount to cents: 1.5% of S/ 101.00 is S/ 1.52', () => {
    const invoice = anInvoice(
      {
        items: [{ description: 'Bienes exonerados', quantity: 1, price: 101 }],
        detraccion: Detraccion.ExemptGoods,
      },
      withAccount,
    );
    expect(invoice.detraccion?.amount.toFixed(2)).toBe('1.52');
  });

  test('without a detracción the Invoice has none', () => {
    expect(anInvoice({ items: service })).not.toHaveProperty('detraccion');
  });
});

describe('calculate: what a detracción needs', () => {
  test("the Issuer's Banco de la Nación account (ERR 3034)", () => {
    const issues = issuesOf(() =>
      anInvoice({ items: service, detraccion: Detraccion.Maintenance }),
    );
    expect(issues[0]).toMatchObject({ code: '3034', path: 'detraccion' });
    expect(issues[0]?.fix).toMatch(/detraccionAccount/);
  });

  test('an Invoice: a Receipt with a detracción is refused before sending', () => {
    const issues = issuesOf(() =>
      aReceipt({ items: service, detraccion: Detraccion.Maintenance }, withAccount),
    );
    expect(issues[0]).toMatchObject({ path: 'detraccion' });
  });

  test('soles: in another currency it would need an exchange rate', () => {
    const issues = issuesOf(() =>
      anInvoice(
        { items: service, currency: Currency.Usd, detraccion: Detraccion.Maintenance },
        withAccount,
      ),
    );
    expect(issues[0]?.why).toMatch(/soles/);
  });

  test('a constant of catalog 54, never a hand-typed code (ERR 3033)', () => {
    const issues = issuesOf(() =>
      anInvoice(
        { items: service, detraccion: { catalog: '54', code: '020', name: 'x' } as never },
        withAccount,
      ),
    );
    expect(issues[0]?.code).toBe('3033');
  });
});
