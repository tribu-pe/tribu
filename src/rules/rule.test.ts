import { describe, expect, test } from 'vitest';
import { DocumentType } from '../catalogs/index';
import { TribuError } from '../results/tribu-error';
import { Rule } from './rule';

const complete = {
  id: 'invoice/example-holds',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '2800',
  effectiveFrom: '2018-01-01',
  why: 'Why SUNAT requires it.',
  fix: 'How to fix it.',
  source: 'Reglas de validación · Factura2_0',
  check: () => true,
};

describe('Rule.define', () => {
  test('returns a frozen Rule', () => {
    const rule = Rule.define(complete);
    expect(rule.id).toBe('invoice/example-holds');
    expect(Object.isFrozen(rule)).toBe(true);
  });

  test.each(['why', 'fix', 'source', 'sunatCode', 'effectiveFrom'] as const)(
    'requires %s, also at runtime for JavaScript users',
    (field) => {
      const { [field]: _omitted, ...incomplete } = complete;
      // @ts-expect-error the compiler rejects a Rule without this field
      expect(() => Rule.define(incomplete)).toThrow(TribuError);
    },
  );

  test('has no severity field: it derives from sunatCode (ADR 0011)', () => {
    // @ts-expect-error severity is not part of a Rule
    expect(() => Rule.define({ ...complete, severity: 'warning' })).toThrow(TribuError);
  });

  test('rejects a sunatCode that SUNAT does not define', () => {
    expect(() => Rule.define({ ...complete, sunatCode: '9999' })).toThrow(TribuError);
  });

  test('the id is <document>/<what-must-hold> in kebab-case', () => {
    expect(() => Rule.define({ ...complete, id: 'CustomerHasRuc' })).toThrow(TribuError);
  });

  test('rejects an effectiveTo before effectiveFrom', () => {
    expect(() => Rule.define({ ...complete, effectiveTo: '2017-12-31' })).toThrow(TribuError);
  });
});
