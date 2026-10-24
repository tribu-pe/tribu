import { describe, expect, test } from 'vitest';
import { Currency } from '../catalogs/index';
import { TribuError } from '../results/tribu-error';
import { Money } from './money';

describe('Money', () => {
  test('carries an exact amount and its currency', () => {
    const price = Money.pen('118.00');
    expect(price.amount.toFixed(2)).toBe('118.00');
    expect(price.currency).toBe(Currency.Pen);
    expect(Money.usd(25).currency).toBe(Currency.Usd);
  });

  test('adds amounts of the same currency', () => {
    expect(Money.pen('0.10').plus(Money.pen('0.20')).amount.toFixed(2)).toBe('0.30');
  });

  test('refuses to add soles and dollars (ERR 2071)', () => {
    expect(() => Money.pen(1).plus(Money.usd(1))).toThrow(TribuError);
  });

  test('is immutable', () => {
    const price = Money.pen(10);
    price.plus(Money.pen(5));
    expect(price.amount.toFixed(2)).toBe('10.00');
    expect(Object.isFrozen(price)).toBe(true);
  });
});
