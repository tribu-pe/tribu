import { describe, expect, test } from 'vitest';
import { TribuError } from '../results/tribu-error';
import { Igv } from './index';

// Rates: docs/research/sunat-facts-2026-10.md § IGV rate (Ley 32387; Ley 31556 as amended by
// Ley 32219). The regime is declared, never the rate (ADR 0012).
describe('Igv', () => {
  test('the general regime charges 18%', () => {
    expect(Igv.rateOn(Igv.General, '2026-10-23').toFixed(2)).toBe('18.00');
    expect(Igv.rateOn(Igv.General, '2029-06-01').toFixed(2)).toBe('18.00');
  });

  test('the hospitality regime charges 10.5% in 2026 and 15% in 2027', () => {
    expect(Igv.rateOn(Igv.Hospitality, '2026-05-01').toFixed(2)).toBe('10.50');
    expect(Igv.rateOn(Igv.Hospitality, '2027-03-01').toFixed(2)).toBe('15.00');
  });

  test('the dated lines change on the exact day, and the last one ends on 2027-12-31', () => {
    expect(Igv.rateOn(Igv.Hospitality, '2026-12-31').toFixed(2)).toBe('10.50');
    expect(Igv.rateOn(Igv.Hospitality, '2027-01-01').toFixed(2)).toBe('15.00');
    expect(Igv.rateOn(Igv.Hospitality, '2027-12-31').toFixed(2)).toBe('15.00');
    expect(() => Igv.rateOn(Igv.Hospitality, '2028-01-01')).toThrow(TribuError);
  });

  test('has no hospitality rate after 2027 and says so instead of guessing', () => {
    try {
      Igv.rateOn(Igv.Hospitality, '2028-01-05');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TribuError);
      expect((error as TribuError).message).toContain('2028-01-05');
      expect((error as TribuError).message).toMatch(/Ley 31556/);
    }
  });

  test('from(code) accepts only known regimes', () => {
    expect(Igv.from('hospitality')).toBe(Igv.Hospitality);
    expect(() => Igv.from('restaurant-hotel-mype')).toThrow(TribuError);
  });

  test('cites the law', () => {
    expect(Igv.Hospitality.source).toMatch(/Ley 31556/);
  });
});
