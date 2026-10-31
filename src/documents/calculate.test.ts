import { describe, expect, test } from 'vitest';
import { CUSTOMER } from '../../test/support/client';
import { anInvoice, aReceipt, settings } from '../../test/support/documents';
import { Affectation, Currency, DocumentType, Identity, Igv, Unit } from '../catalogs/index';
import { TribuError } from '../results/tribu-error';
import { calculate } from './calculate';
import { Money } from './money';
import { Ruc } from './ruc';

const firstItem = <T extends { items: readonly unknown[] }>(document: T): T['items'][number] => {
  const [item] = document.items;
  if (item === undefined) throw new Error('the document has no items');
  return item;
};

const fixed = (value: { toFixed(places: number): string }) => value.toFixed(2);

// ADR 0001: an Item gives `price` (Unit Price, tax included) or `value` (Unit Value, tax excluded).
describe('calculate: an item with a tax-included price', () => {
  test('3 × S/10.00 must total S/30.00: round at the end, never the Unit Value', () => {
    const item = firstItem(
      anInvoice({ items: [{ description: 'Galletas', quantity: 3, price: '10.00' }] }),
    );
    expect(item.unitValue.toFixed(10)).toBe('8.4745762712');
    expect(fixed(item.value)).toBe('25.42');
    expect(fixed(item.igv)).toBe('4.58');
    expect(fixed(item.total)).toBe('30.00');
  });

  test('1 × S/10.00 totals what the customer paid: IGV = total − value (8.47 + 1.53)', () => {
    // value × 18% would give 1.52 and a total of 9.99.
    const item = firstItem(
      anInvoice({ items: [{ description: 'Galletas', quantity: 1, price: '10.00' }] }),
    );
    expect(fixed(item.value)).toBe('8.47');
    expect(fixed(item.igv)).toBe('1.53');
    expect(fixed(item.total)).toBe('10.00');
  });

  test('2 × S/118.00 is 200.00 + 36.00 = 236.00', () => {
    const item = firstItem(
      anInvoice({ items: [{ description: 'Teclado', quantity: 2, price: 118 }] }),
    );
    expect(fixed(item.unitPrice)).toBe('118.00');
    expect(fixed(item.value)).toBe('200.00');
    expect(fixed(item.igv)).toBe('36.00');
    expect(fixed(item.total)).toBe('236.00');
  });

  test('accepts decimal quantities', () => {
    const item = firstItem(
      anInvoice({ items: [{ description: 'Café', quantity: '1.5', price: 20 }] }),
    );
    expect(fixed(item.total)).toBe('30.00');
  });
});

describe('calculate: an item with a tax-excluded value', () => {
  test('2 × S/100.00 is 200.00 + 36.00 = 236.00', () => {
    const item = firstItem(
      anInvoice({ items: [{ description: 'Teclado', quantity: 2, value: 100 }] }),
    );
    expect(fixed(item.unitValue)).toBe('100.00');
    expect(fixed(item.unitPrice)).toBe('118.00');
    expect(fixed(item.igv)).toBe('36.00');
    expect(fixed(item.total)).toBe('236.00');
  });

  test('IGV is the value times the rate, rounded once', () => {
    const item = firstItem(
      anInvoice({ items: [{ description: 'Galletas', quantity: 1, value: '8.47' }] }),
    );
    expect(fixed(item.igv)).toBe('1.52'); // 8.47 × 0.18 = 1.5246
    expect(fixed(item.total)).toBe('9.99');
  });
});

describe('calculate: price or value, never both', () => {
  test('rejects an item with both', () => {
    expect(() =>
      anInvoice({ items: [{ description: 'Teclado', quantity: 1, price: 118, value: 100 }] }),
    ).toThrow(TribuError);
  });

  test('rejects an item with neither, pointing at the item', () => {
    try {
      anInvoice({ items: [{ description: 'Teclado', quantity: 1 }] });
      expect.unreachable();
    } catch (error) {
      expect((error as TribuError).kind).toBe('validation');
      expect((error as TribuError).issues[0]?.path).toBe('items[0]');
    }
  });

  test('rejects a document without items', () => {
    expect(() => anInvoice({ items: [] })).toThrow(TribuError);
  });

  test('collects every problem before throwing', () => {
    try {
      anInvoice({
        items: [
          { description: 'A', quantity: 1 },
          { description: 'B', quantity: 1, price: 1, value: 1 },
        ],
      });
      expect.unreachable();
    } catch (error) {
      expect((error as TribuError).issues.map((issue) => issue.path)).toEqual([
        'items[0]',
        'items[1]',
      ]);
    }
  });
});

describe('calculate: Tax Affectation', () => {
  test('an exempt item pays no IGV', () => {
    const [item] = anInvoice({
      items: [{ description: 'Libro', quantity: 1, price: 40, affectation: Affectation.Exempt }],
    }).items;
    expect(fixed(item.value)).toBe('40.00');
    expect(fixed(item.igv)).toBe('0.00');
    expect(fixed(item.total)).toBe('40.00');
  });

  test('the header totals are the sums of the items, by affectation', () => {
    const invoice = anInvoice({
      items: [
        { description: 'Teclado', quantity: 2, price: 118 },
        { description: 'Libro', quantity: 1, price: 40, affectation: Affectation.Exempt },
        { description: 'Curso', quantity: 3, value: 10, affectation: Affectation.Unaffected },
      ],
    });
    expect(fixed(invoice.totals.taxed)).toBe('200.00');
    expect(fixed(invoice.totals.exempt)).toBe('40.00');
    expect(fixed(invoice.totals.unaffected)).toBe('30.00');
    expect(fixed(invoice.totals.igv)).toBe('36.00');
    expect(fixed(invoice.totals.value)).toBe('270.00');
    expect(fixed(invoice.totals.payable)).toBe('306.00');
  });

  test('rejects affectations outside v0.1 with an explicit error', () => {
    expect(() =>
      anInvoice({
        items: [
          { description: 'Muestra', quantity: 1, price: 0, affectation: Affectation.from('15') },
        ],
      }),
    ).toThrow(/not supported/i);
  });
});

describe('calculate: IGV Regime', () => {
  test('the hospitality regime uses 10.5% in 2026', () => {
    const invoice = anInvoice(
      { items: [{ description: 'Almuerzo', quantity: 1, price: '110.50' }] },
      { issuer: { ...settings().issuer, igv: Igv.Hospitality } },
    );
    expect(invoice.igvRate.toFixed(2)).toBe('10.50');
    expect(fixed(firstItem(invoice).value)).toBe('100.00');
    expect(fixed(firstItem(invoice).igv)).toBe('10.50');
  });

  test('the rate is the one in force on the issue date, not today', () => {
    const invoice = anInvoice(
      { issueDate: '2027-01-02', items: [{ description: 'Almuerzo', quantity: 1, price: 115 }] },
      { issuer: { ...settings().issuer, igv: Igv.Hospitality }, today: '2027-01-02' },
    );
    expect(invoice.igvRate.toFixed(2)).toBe('15.00');
  });
});

describe('calculate: amounts SUNAT rejects (factura-2.0.csv ERR 2024, 2025, 2367, 2369, 2370)', () => {
  const codesOf = (input: Parameters<typeof anInvoice>[0]): string[] => {
    try {
      anInvoice(input);
    } catch (error) {
      return (error as TribuError).issues.map((found) => found.code);
    }
    return [];
  };
  const line = (fields: object) => ({
    items: [{ description: 'Teclado', quantity: 1, ...fields }],
  });

  test('a zero quantity is ERR 2024', () => {
    expect(codesOf(line({ quantity: 0, price: 10 }))).toEqual(['2024']);
  });

  test.each([-1, '-0.5', '0.12345678901'])('a quantity of %s is ERR 2025', (quantity) => {
    expect(codesOf(line({ quantity, price: 10 }))).toEqual(['2025']);
  });

  test('a price of zero is ERR 2367, and a value of zero is ERR 2369', () => {
    expect(codesOf(line({ price: 0 }))).toEqual(['2367']);
    expect(codesOf(line({ value: 0 }))).toEqual(['2369']);
  });

  test('a negative price is rejected', () => {
    expect(codesOf(line({ price: -5 }))).toEqual(['2367']);
  });

  test('a line that rounds to a value of 0.00 is ERR 2370', () => {
    expect(codesOf(line({ price: 0.001 }))).toEqual(['2370']);
  });

  test('a JavaScript float price with many decimals still passes (it is rounded, not rejected)', () => {
    expect(codesOf(line({ price: 0.1 + 0.2 }))).toEqual([]);
  });

  test('a quantity with 10 decimals and the smallest sellable line pass', () => {
    expect(codesOf(line({ quantity: '0.1234567890', price: 100 }))).toEqual([]);
    expect(codesOf(line({ price: 0.01 }))).toEqual([]);
  });

  test.each([0.5, -1, 123_456_789])('a Number of %s is rejected', (number) => {
    expect(codesOf({ number })).toEqual(['1001']);
  });

  test('every bad line is reported, not just the first', () => {
    const input = {
      items: [
        { description: 'A', quantity: 0, price: 10 },
        { description: 'B', quantity: 1, price: 0 },
      ],
    };
    expect(codesOf(input)).toEqual(['2024', '2367']);
  });
});

describe('calculate: dates', () => {
  const pathsOf = (run: () => unknown): string[] => {
    try {
      run();
    } catch (error) {
      return (error as TribuError).issues.map((found) => found.path);
    }
    return [];
  };

  test.each(['31/10/2026', '2026-10-5', '2026-02-30', '2026-13-01', ''])(
    'an issue date of "%s" is a validation error, not a date that passes every deadline Rule',
    (issueDate) => {
      expect(pathsOf(() => anInvoice({ issueDate }))).toEqual(['issueDate']);
    },
  );

  test('an installment due date that is not a date is a validation error', () => {
    const payment = { installments: [{ amount: 236, due: '30-11-2026' }] };
    expect(pathsOf(() => anInvoice({ payment }))).toEqual(['payment.installments[0].due']);
  });

  test('a real date, including 29 February of a leap year, passes', () => {
    expect(anInvoice({ issueDate: '2024-02-29' }).issueDate).toBe('2024-02-29');
  });
});

describe('calculate: defaults and where each value came from', () => {
  test('unit and affectation default to goods and taxed', () => {
    const item = firstItem(anInvoice());
    expect(item.unit).toBe(Unit.Goods);
    expect(item.affectation).toBe(Affectation.Taxed);
    expect(item.sources).toEqual({ unit: 'default', affectation: 'default' });
  });

  test('an issuer default overrides the convention', () => {
    const item = firstItem(
      anInvoice({}, { defaults: { unit: Unit.Service, affectation: Affectation.Taxed } }),
    );
    expect(item.unit).toBe(Unit.Service);
    expect(item.sources.unit).toBe('issuer');
  });

  test('an item value overrides the issuer default', () => {
    const [item] = anInvoice(
      { items: [{ description: 'Teclado', quantity: 1, price: 118, unit: Unit.Goods }] },
      { defaults: { unit: Unit.Service, affectation: Affectation.Taxed } },
    ).items;
    expect(item.unit).toBe(Unit.Goods);
    expect(item.sources.unit).toBe('item');
  });

  test('the issue date defaults to today in Lima, given by the configuration', () => {
    expect(anInvoice({}, { today: '2026-10-23' }).issueDate).toBe('2026-10-23');
  });

  test('currency defaults to PEN', () => {
    expect(anInvoice().currency).toBe(Currency.Pen);
  });

  test('payment terms default to cash', () => {
    expect(anInvoice().payment).toEqual({ terms: 'cash' });
  });

  test('series default by convention', () => {
    expect(anInvoice().series).toBe('F001');
    expect(aReceipt().series).toBe('B001');
  });
});

describe('calculate: Value Objects from the first step (ADR 0016)', () => {
  test('a RUC string becomes a Ruc', () => {
    const invoice = anInvoice({ customer: CUSTOMER });
    expect(invoice.customer.identity).toBe(Identity.Ruc);
    expect(invoice.customer.number).toBeInstanceOf(Ruc);
  });

  test.each([
    [{ dni: '12345678', name: 'Juan Pérez' }, Identity.Dni],
    [{ ce: '001234567', name: 'Ana Silva' }, Identity.ForeignerId],
    [{ passport: 'X1234567', name: 'John Smith' }, Identity.Passport],
    [{ id: Identity.DiplomaticId, number: 'D123', name: 'Embajada' }, Identity.DiplomaticId],
  ])('a receipt customer %o is identified as %o', (customer, identity) => {
    expect(aReceipt({ customer }).customer.identity).toBe(identity);
  });

  test('an invalid RUC points at customer.ruc', () => {
    try {
      anInvoice({ customer: { ruc: '20000000002', name: 'X SAC' } });
      expect.unreachable();
    } catch (error) {
      expect((error as TribuError).issues[0]?.path).toBe('customer.ruc');
    }
  });

  test('a receipt without customer is an Anonymous Customer', () => {
    expect(aReceipt({ customer: undefined }).customer).toEqual({ anonymous: true });
  });

  test('an invoice requires a customer', () => {
    expect(() => anInvoice({ customer: undefined })).toThrow(TribuError);
  });

  test('Money in another currency than the document is rejected (ERR 2071)', () => {
    try {
      anInvoice({ items: [{ description: 'Teclado', quantity: 1, price: Money.usd(25) }] });
      expect.unreachable();
    } catch (error) {
      expect((error as TribuError).issues[0]).toMatchObject({
        code: '2071',
        path: 'items[0].price',
      });
    }
  });

  test('Money in the document currency is accepted', () => {
    const invoice = anInvoice({
      currency: Currency.Usd,
      items: [{ description: 'Teclado', quantity: 1, price: Money.usd(25) }],
    });
    expect(fixed(invoice.totals.payable)).toBe('25.00');
  });

  test('the calculated document survives a JSON round trip (ADR 0008)', () => {
    const invoice = anInvoice();
    expect(() => JSON.parse(JSON.stringify(invoice))).not.toThrow();
  });
});

describe('calculate: credit payment terms', () => {
  test('the amount pending payment is the total', () => {
    const invoice = anInvoice({
      payment: {
        installments: [
          { amount: 118, due: '2026-11-30' },
          { amount: 118, due: '2026-12-30' },
        ],
      },
    });
    expect(invoice.payment.terms).toBe('credit');
    if (invoice.payment.terms === 'credit') {
      expect(fixed(invoice.payment.pending)).toBe('236.00');
      expect(invoice.payment.installments).toHaveLength(2);
    }
  });
});

describe('calculate: document types', () => {
  test('knows which document it calculated', () => {
    expect(anInvoice().type).toBe(DocumentType.Invoice);
    expect(aReceipt().type).toBe(DocumentType.Receipt);
  });

  test('leaves the Number to be reserved later', () => {
    expect(
      calculate(
        DocumentType.Invoice,
        { customer: CUSTOMER, items: [{ description: 'A', quantity: 1, price: 1 }] },
        settings(),
      ).number,
    ).toBeUndefined();
  });
});
