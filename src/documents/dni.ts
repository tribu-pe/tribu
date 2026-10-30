import { TribuError } from '../results/tribu-error';

function invalid(value: string): TribuError {
  return new TribuError({
    kind: 'validation',
    issues: [
      {
        code: 'tribu',
        path: 'dni',
        why: `"${value}" is not a valid DNI: it must have exactly 8 digits.`,
        fix: 'Pass the 8 digits of the Documento Nacional de Identidad.',
        source: 'Reglas de validación · Boleta2_0',
      },
    ],
  });
}

/** A DNI exists only when valid. */
export class Dni {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static from(input: string | Dni): Dni {
    if (input instanceof Dni) return input;
    if (!/^\d{8}$/.test(input)) throw invalid(input);
    return new Dni(input);
  }

  toString(): string {
    return this.value;
  }
}
