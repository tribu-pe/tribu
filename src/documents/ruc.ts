import { TribuError } from '../results/tribu-error';

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;
const PREFIXES = ['10', '15', '16', '17', '20'] as const;

function invalid(value: string, why: string): TribuError {
  return new TribuError({
    kind: 'validation',
    issues: [
      {
        code: 'tribu',
        path: 'ruc',
        why: `"${value}" is not a valid RUC: ${why}.`,
        fix: 'Check the 11 digits and the check digit (weights 5,4,3,2,7,6,5,4,3,2).',
        source: 'Reglas de validación · Factura2_0',
      },
    ],
  });
}

function checkDigit(value: string): number {
  let sum = 0;
  for (let index = 0; index < WEIGHTS.length; index += 1) {
    sum += Number(value[index] ?? '0') * (WEIGHTS[index] ?? 0);
  }
  const digit = 11 - (sum % 11);
  if (digit === 10) return 0;
  if (digit === 11) return 1;
  return digit;
}

/** A RUC exists only when valid. */
export class Ruc {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static from(input: string | Ruc): Ruc {
    if (input instanceof Ruc) return input;
    if (!/^\d{11}$/.test(input)) throw invalid(input, 'it must have 11 digits');
    if (!PREFIXES.includes(input.slice(0, 2) as (typeof PREFIXES)[number])) {
      throw invalid(input, 'only the prefixes 10, 15, 16, 17 and 20 are allowed');
    }
    if (checkDigit(input) !== Number(input[10])) {
      throw invalid(input, 'the check digit does not match');
    }
    return new Ruc(input);
  }

  toString(): string {
    return this.value;
  }
}
