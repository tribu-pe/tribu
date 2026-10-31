import { type Issue, issue, TribuError } from '../results/tribu-error';

export type DocumentFamily = 'invoice' | 'receipt';

function invalid(value: string): TribuError {
  return new TribuError({
    kind: 'validation',
    issues: [
      {
        code: '1001',
        path: 'id',
        why: `"${value}" is not a Series-Number: it must match [F|B][A-Z0-9]{3}-[0-9]{1,8}.`,
        fix: 'Pass an id such as "F001-123".',
        source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
      },
    ],
  });
}

/** The Number of a Series-Number: a whole number of at most 8 digits (`[0-9]{1,8}`). */
export function isDocumentNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99_999_999;
}

export function badNumber(path: string, value: unknown): Issue {
  return issue(
    path,
    '1001',
    `The Number ${String(value)} is not a whole number of 1 to 8 digits.`,
    'Pass a whole number up to 99999999, or make nextNumber return one.',
    'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  );
}

/** A Series-Number pair (serie y número correlativo). */
export class DocumentId {
  readonly series: string;
  readonly number: number;

  private constructor(series: string, number: number) {
    this.series = series;
    this.number = number;
    Object.freeze(this);
  }

  static parse(value: string): DocumentId {
    const match = /^([FB][A-Z0-9]{3})-(\d{1,8})$/.exec(value);
    const series = match?.[1];
    const number = match?.[2];
    if (series === undefined || number === undefined) throw invalid(value);
    return new DocumentId(series, Number(number));
  }

  get family(): DocumentFamily {
    return this.series.startsWith('F') ? 'invoice' : 'receipt';
  }

  toString(): string {
    return `${this.series}-${this.number}`;
  }
}
