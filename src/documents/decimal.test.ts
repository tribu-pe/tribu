import { describe, expect, test } from 'vitest';
import { Rounding } from '../options';
import { Decimal } from './decimal';

describe('Decimal', () => {
  test('adds without binary floating-point error', () => {
    expect(Decimal.from('0.1').plus(Decimal.from('0.2')).toString()).toBe('0.3');
  });

  test('accepts numbers and strings with the same meaning', () => {
    expect(Decimal.from(19.99).equals(Decimal.from('19.99'))).toBe(true);
  });

  test('keeps 10 decimals when deriving a Unit Value from a Unit Price', () => {
    // 10.00 / 1.18 = 8.4745762711864…: SUNAT allows up to 10 decimals (ERR 2369).
    expect(Decimal.from('10').div(Decimal.from('1.18')).toFixed(10)).toBe('8.4745762712');
  });

  test('rounds half-up by default', () => {
    expect(Decimal.from('2.345').round(2).toFixed(2)).toBe('2.35');
    expect(Decimal.from('2.344').round(2).toFixed(2)).toBe('2.34');
  });

  test('rounds with the mode it is given', () => {
    expect(Decimal.from('2.345').round(2, Rounding.HalfUp).toFixed(2)).toBe('2.35');
  });

  test.todo(
    'rounds half-even with Rounding.HalfEven, once Milestone 0 proves SUNAT accepts it (ADR 0018)',
  );

  test('prints a fixed number of decimals for the XML', () => {
    expect(Decimal.from('236').toFixed(2)).toBe('236.00');
  });

  test('rejects values that are not numbers', () => {
    expect(() => Decimal.from('12,50')).toThrow();
    expect(() => Decimal.from(Number.NaN)).toThrow();
  });
});
