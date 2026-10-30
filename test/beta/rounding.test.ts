import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, test } from 'vitest';
import { Affectation, Igv, Rounding, Unit } from '../../src/index';
import { CUSTOMER, ISSUER } from '../support/client';
import { betaClient, expectAccepted, freshNumber, outcome } from './support';

// Milestone 0, step 4 and question 3: rounding cases must be accepted without Observations.
// Each case is kept in fixtures/rounding/<name>.json with SUNAT's answer.
type Items = NonNullable<Parameters<ReturnType<typeof betaClient>['invoice']>[0]['items']>;

const cases: [string, Items][] = [
  ['price-two-units', [{ description: 'Teclado', quantity: 2, price: 118 }]],
  ['value-one-unit', [{ description: 'Teclado', quantity: 1, value: 100 }]],
  ['price-ten-soles', [{ description: 'Lapicero', quantity: 1, price: 10 }]],
  ['price-ten-cents-times-three', [{ description: 'Caramelo', quantity: 3, price: 0.1 }]],
  ['value-half-cent', [{ description: 'Clavo', quantity: 1, value: 0.125 }]],
  ['price-half-cent', [{ description: 'Clavo', quantity: 1, price: 1.005 }]],
  ['value-half-cent-large', [{ description: 'Servidor', quantity: 1, value: 1234.565 }]],
  [
    'several-lines',
    [
      { description: 'Cuaderno', quantity: 3, price: 19.9 },
      { description: 'Borrador', quantity: 7, price: 4.5 },
      { description: 'Clip', quantity: 11, price: 0.99 },
    ],
  ],
  ['decimal-quantity-price', [{ description: 'Arroz', quantity: 1.5, price: 12.5 }]],
  ['decimal-quantity-value', [{ description: 'Cable', quantity: 2.75, value: 3.333 }]],
  [
    'taxed-and-exempt',
    [
      { description: 'Teclado', quantity: 1, price: 118 },
      { description: 'Libro', quantity: 1, value: 50, affectation: Affectation.Exempt },
    ],
  ],
  [
    'taxed-and-unaffected',
    [
      { description: 'Servicio', quantity: 1, value: 10.1, unit: Unit.Service },
      { description: 'Donación', quantity: 1, value: 5.55, affectation: Affectation.Unaffected },
    ],
  ],
  [
    'twenty-small-lines',
    Array.from({ length: 20 }, (_, index) => ({
      description: `Galleta ${index + 1}`,
      quantity: 1,
      price: 0.35,
    })),
  ],
];

const hospitality: [string, Items][] = [
  ['hospitality-price', [{ description: 'Menú', quantity: 1, price: 105 }]],
  ['hospitality-value', [{ description: 'Habitación', quantity: 3, value: 99.99 }]],
];

const boundaries = ['value-half-cent', 'price-half-cent', 'value-half-cent-large'];

async function run(name: string, items: Items, options: Parameters<typeof betaClient>[0]) {
  const result = await outcome(
    betaClient(options).invoice({ customer: CUSTOMER, items, number: freshNumber() }),
  );
  mkdirSync('fixtures/rounding', { recursive: true });
  const document = result.record?.document;
  writeFileSync(
    `fixtures/rounding/${name}.json`,
    `${JSON.stringify(
      {
        input: {
          items,
          rounding: options?.rounding ?? Rounding.HalfUp,
          igv: options?.issuer?.igv ?? Igv.General,
        },
        totals: document?.totals,
        sunat: {
          code: result.record?.cdr?.code,
          description: result.record?.cdr?.description,
          observations: result.record?.cdr?.observations,
          error: result.error?.issues,
        },
      },
      null,
      2,
    )}\n`,
  );
  expectAccepted(result);
}

describe('SUNAT beta: rounding', () => {
  test.each(cases)('%s', (name, items) => run(name, items, {}));

  test.each(cases.filter(([name]) => boundaries.includes(name)))('%s, half-even', (name, items) =>
    run(`${name}-half-even`, items, { rounding: Rounding.HalfEven }),
  );

  test.each(hospitality)('%s (10.5%%)', (name, items) =>
    run(name, items, { issuer: { ...ISSUER, igv: Igv.Hospitality } }),
  );
});
