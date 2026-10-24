import { describe, expect, test } from 'vitest';
import { anInvoice, aReceipt } from '../../test/support/documents';
import { DocumentType } from '../catalogs/index';
import { Rule } from './rule';
import { validate } from './validate';

const failing = (overrides: Partial<Parameters<typeof Rule.define>[0]> = {}) =>
  Rule.define({
    id: 'invoice/always-fails',
    appliesTo: [DocumentType.Invoice],
    sunatCode: '2108', // an ERROR in SUNAT's workbook
    effectiveFrom: '2018-01-01',
    why: 'Test rule.',
    fix: 'Nothing to fix.',
    source: 'Test',
    check: () => ({ path: 'issueDate' }),
    ...overrides,
  });

const options = { today: '2026-10-23', disable: [] as string[] };

describe('validate: the rule engine (ADR 0016)', () => {
  test('reports a failing Rule with its SUNAT code, path, why, fix and source', () => {
    const { errors } = validate(anInvoice(), [failing()], options);
    expect(errors).toEqual([
      {
        code: '2108',
        path: 'issueDate',
        why: 'Test rule.',
        fix: 'Nothing to fix.',
        source: 'Test',
        rule: 'invoice/always-fails',
      },
    ]);
  });

  test('a passing Rule reports nothing', () => {
    expect(validate(anInvoice(), [failing({ check: () => true })], options)).toEqual({
      errors: [],
      warnings: [],
    });
  });

  test('skips Rules for other document types', () => {
    expect(validate(aReceipt(), [failing()], options).errors).toEqual([]);
  });

  test('applies a Rule only on documents issued while it is in force', () => {
    const future = failing({ effectiveFrom: '2027-01-01' });
    expect(validate(anInvoice({ issueDate: '2026-12-31' }), [future], options).errors).toHaveLength(
      0,
    );
    expect(
      validate(anInvoice({ issueDate: '2027-01-01' }), [future], {
        ...options,
        today: '2027-01-01',
      }).errors,
    ).toHaveLength(1);
  });

  test('a Rule with effectiveTo stops applying after it', () => {
    const past = failing({ effectiveTo: '2025-12-31' });
    expect(validate(anInvoice(), [past], options).errors).toHaveLength(0);
  });

  test('an OBSERVATION code becomes a warning, never an error (ADR 0011)', () => {
    const observed = failing({ sunatCode: '4443' });
    expect(validate(anInvoice(), [observed], options)).toMatchObject({
      errors: [],
      warnings: [{ code: '4443' }],
    });
  });

  test('severity follows the code on the issue date: 3496 warns in 2026, blocks in 2027', () => {
    const classification = failing({ sunatCode: '3496' });
    expect(
      validate(anInvoice({ issueDate: '2026-12-31' }), [classification], options).warnings,
    ).toHaveLength(1);
    expect(
      validate(anInvoice({ issueDate: '2027-01-01' }), [classification], {
        ...options,
        today: '2027-01-01',
      }).errors,
    ).toHaveLength(1);
  });

  test('rules.disable switches a Rule off by id', () => {
    expect(
      validate(anInvoice(), [failing()], { ...options, disable: ['invoice/always-fails'] }).errors,
    ).toEqual([]);
  });

  test('collects the issues of every Rule, not just the first', () => {
    const second = failing({
      id: 'invoice/also-fails',
      sunatCode: '2800',
      check: () => ({ path: 'customer' }),
    });
    expect(
      validate(anInvoice(), [failing(), second], options).errors.map((issue) => issue.code),
    ).toEqual(['2108', '2800']);
  });
});
