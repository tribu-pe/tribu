import type { CatalogEntry } from '../catalogs/catalog';
import { Currency } from '../catalogs/shared';
import { TribuError } from '../results/tribu-error';
import { Decimal } from './decimal';

/** An amount with its currency. Immutable: adding returns a new Money. */
export class Money {
  readonly amount: Decimal;
  readonly currency: CatalogEntry;

  private constructor(amount: Decimal, currency: CatalogEntry) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  static pen(value: number | string | Decimal): Money {
    return new Money(Decimal.from(value), Currency.Pen);
  }

  static usd(value: number | string | Decimal): Money {
    return new Money(Decimal.from(value), Currency.Usd);
  }

  plus(other: Money): Money {
    if (other.currency.code !== this.currency.code) {
      throw new TribuError({
        kind: 'validation',
        issues: [
          {
            code: '2071',
            path: 'currency',
            why: `Cannot add ${this.currency.code} and ${other.currency.code} amounts.`,
            fix: 'Use one currency per document.',
            source: 'Reglas de validación · Factura2_0 (ERR 2071)',
          },
        ],
      });
    }
    return new Money(this.amount.plus(other.amount), this.currency);
  }
}
