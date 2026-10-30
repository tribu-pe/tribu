import Big from 'big.js';
import { Rounding, type RoundingValue } from '../options';
import { TribuError } from '../results/tribu-error';

const MODES = { 'half-up': Big.roundHalfUp, 'half-even': Big.roundHalfEven } as const;

function invalid(value: string): TribuError {
  return new TribuError({
    kind: 'validation',
    issues: [
      {
        code: '2369',
        path: 'value',
        why: `"${value}" is not a decimal number.`,
        fix: 'Pass a number or a decimal string such as "118.00".',
        source: 'SUNAT accepts up to 10 decimals (ERR 2369)',
      },
    ],
  });
}

/** Exact decimal arithmetic. The only module allowed to import big.js (ADR 0001). */
export class Decimal {
  readonly #value: Big;

  private constructor(value: Big) {
    this.#value = value;
  }

  static from(value: number | string | Decimal): Decimal {
    if (value instanceof Decimal) return value;
    if (typeof value === 'number' && !Number.isFinite(value)) throw invalid(String(value));
    if (typeof value === 'string' && !/^-?\d+(\.\d+)?$/.test(value.trim())) throw invalid(value);
    try {
      return new Decimal(new Big(typeof value === 'string' ? value.trim() : value));
    } catch {
      throw invalid(String(value));
    }
  }

  plus(other: Decimal): Decimal {
    return new Decimal(this.#value.plus(other.#value));
  }

  minus(other: Decimal): Decimal {
    return new Decimal(this.#value.minus(other.#value));
  }

  times(other: Decimal): Decimal {
    return new Decimal(this.#value.times(other.#value));
  }

  div(other: Decimal): Decimal {
    if (other.#value.eq(0)) throw invalid('division by zero');
    return new Decimal(this.#value.div(other.#value));
  }

  round(places: number, mode: RoundingValue = Rounding.HalfUp): Decimal {
    return new Decimal(this.#value.round(places, MODES[mode.rounding]));
  }

  toFixed(places: number): string {
    return this.#value.toFixed(places);
  }

  equals(other: Decimal): boolean {
    return this.#value.eq(other.#value);
  }

  compare(other: Decimal): number {
    return this.#value.cmp(other.#value);
  }

  toString(): string {
    return this.#value.toString();
  }

  toJSON(): string {
    return this.#value.toString();
  }
}
