import { describe, expect, test } from 'vitest';
import { TribuError } from '../results/tribu-error';
import { Dni } from './dni';

describe('Dni', () => {
  test('accepts 8 digits', () => {
    expect(Dni.from('12345678').value).toBe('12345678');
  });

  test.each(['1234567', '123456789', '1234567A', ''])('rejects %j', (value) => {
    expect(() => Dni.from(value)).toThrow(TribuError);
  });
});
