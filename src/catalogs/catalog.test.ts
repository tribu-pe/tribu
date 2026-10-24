import { describe, expect, test } from 'vitest';
import { TribuError } from '../results/tribu-error';
import { Catalog } from './catalog';

const Example = Catalog.define('example', {
  source: 'Test source §1',
  entries: {
    First: { code: '01', name: 'Primero' },
    Second: { code: '02', name: 'Segundo' },
  },
});

const Ranged = Catalog.define('ranged', {
  source: 'Test source §2',
  entries: {
    Zero: { code: '0', name: 'Cero' },
    Low: { range: ['0100', '0999'], name: 'Bajo' },
    High: { range: ['4000', null], name: 'Alto' },
  },
});

describe('Catalog.define', () => {
  test('each entry knows its catalog, code and official name', () => {
    expect(Example.First).toMatchObject({ catalog: 'example', code: '01', name: 'Primero' });
  });

  test('entries are frozen', () => {
    expect(Object.isFrozen(Example.First)).toBe(true);
    expect(() => {
      (Example.First as { code: string }).code = '99';
    }).toThrow();
  });

  test('the source is declared once per catalog', () => {
    expect(Example.source).toBe('Test source §1');
  });

  test('from(code) returns the same entry instance', () => {
    expect(Example.from('02')).toBe(Example.Second);
  });

  test('from(code) throws for an unknown code', () => {
    expect(() => Example.from('99')).toThrow(TribuError);
  });

  test('lists every entry', () => {
    expect(Example.all()).toEqual([Example.First, Example.Second]);
  });

  test('classify(code) finds the entry whose range contains the code', () => {
    expect(Ranged.classify('0')).toBe(Ranged.Zero);
    expect(Ranged.classify('0102')).toBe(Ranged.Low);
    expect(Ranged.classify('4473')).toBe(Ranged.High);
  });

  test('classify(code) throws when no entry covers the code', () => {
    expect(() => Ranged.classify('2000')).toThrow(TribuError);
  });

  test('two catalogs with the same code are different entries', () => {
    const Other = Catalog.define('other', {
      source: 'Test source §3',
      entries: { First: { code: '01', name: 'Primero' } },
    });
    expect(Other.First).not.toBe(Example.First);
    expect(Other.First.catalog).not.toBe(Example.First.catalog);
  });
});
