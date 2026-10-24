import { describe, expect, test } from 'vitest';
import { TribuError } from '../../results/tribu-error';
import { Reason as CreditReason } from './credit-note';
import { Reason as DebitReason } from './debit-note';

// sources/sunat/reglas-validacion-2026-08-26/catalogos.csv, catalogs 09 and 10.
describe('catalog 09: credit note Reason', () => {
  test.each([
    [CreditReason.Void, '01', 'Anulación de la operación'],
    [CreditReason.WrongRuc, '02', 'Anulación por error en el RUC'],
    [CreditReason.Global.Discount, '04', 'Descuento global'],
    [CreditReason.Item.Discount, '05', 'Descuento por ítem'],
    [CreditReason.Total.Return, '06', 'Devolución total'],
    [CreditReason.Item.Return, '07', 'Devolución por ítem'],
    [CreditReason.Bonus, '08', 'Bonificación'],
    [CreditReason.ValueDecrease, '09', 'Disminución en el valor'],
    [CreditReason.Other, '10', 'Otros Conceptos'],
  ])('%o', (entry, code, name) => {
    expect(entry).toMatchObject({ catalog: '09', code, name });
  });

  test('FixDescription is code 03', () => {
    expect(CreditReason.FixDescription).toMatchObject({ catalog: '09', code: '03' });
  });

  test('from(code) returns the constant', () => {
    expect(CreditReason.from('07')).toBe(CreditReason.Item.Return);
  });
});

describe('catalog 10: debit note Reason', () => {
  test.each([
    [DebitReason.Interest, '01', 'Intereses por mora'],
    [DebitReason.ValueIncrease, '02', 'Aumento en el valor'],
    [DebitReason.Penalty, '03', 'Penalidades/ otros conceptos'],
  ])('%o', (entry, code, name) => {
    expect(entry).toMatchObject({ catalog: '10', code, name });
  });
});

describe('the two catalogs reuse codes with different meanings (ADR 0005)', () => {
  test("credit '01' and debit '01' are different constants", () => {
    expect(CreditReason.Void.code).toBe(DebitReason.Interest.code);
    expect(CreditReason.Void).not.toBe(DebitReason.Interest);
  });

  test('each catalog only accepts its own codes', () => {
    expect(() => DebitReason.from('07')).toThrow(TribuError);
  });
});
