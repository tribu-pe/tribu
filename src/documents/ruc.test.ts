import { describe, expect, test } from 'vitest';
import { TribuError } from '../results/tribu-error';
import { Ruc } from './ruc';

// RUC check digit: weights 5,4,3,2,7,6,5,4,3,2 over the first 10 digits;
// digit = 11 - (sum mod 11), where 10 → 0 and 11 → 1.
describe('Ruc', () => {
  test.each([
    ['20131312955', 'SUNAT’s own RUC'],
    ['20000000001', 'the test issuer'],
    ['20123456786', 'the test customer'],
    ['10000000006', 'a natural person (prefix 10)'],
  ])('accepts %s (%s)', (value) => {
    expect(Ruc.from(value).value).toBe(value);
  });

  test.each([
    ['20000000002', 'wrong check digit'],
    ['20123456789', 'wrong check digit (expected 6)'],
    ['30000000007', 'prefix 30 is not allowed; only 10, 15, 16, 17 and 20 are'],
    ['2000000000', '10 digits'],
    ['2000000000A', 'not numeric'],
  ])('rejects %s (%s)', (value) => {
    expect(() => Ruc.from(value)).toThrow(TribuError);
  });

  test('the error explains the check digit', () => {
    try {
      Ruc.from('20000000002');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TribuError);
      expect((error as TribuError).kind).toBe('validation');
      expect((error as TribuError).message).toMatch(/check digit/i);
    }
  });

  test('a Ruc passes through unchanged', () => {
    const ruc = Ruc.from('20000000001');
    expect(Ruc.from(ruc)).toBe(ruc);
  });
});
