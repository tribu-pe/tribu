import { inspect } from 'node:util';
import { describe, expect, test } from 'vitest';
import { TribuError } from './tribu-error';

const issue = {
  code: '2800',
  path: 'customer',
  why: 'Only invoices give IGV tax credit, so the buyer must have a RUC.',
  fix: 'Use sunat.receipt(...) for customers without RUC.',
  source: 'Reglas de validación · Factura2_0',
};

describe('TribuError', () => {
  test('is an Error with a kind and issues', () => {
    const error = new TribuError({ kind: 'validation', issues: [issue] });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TribuError');
    expect(error.kind).toBe('validation');
    expect(error.issues).toEqual([issue]);
  });

  test.each(['config', 'validation', 'rejected', 'unconfirmed', 'exception'] as const)(
    'accepts the kind %s',
    (kind) => {
      expect(new TribuError({ kind, issues: [issue] }).kind).toBe(kind);
    },
  );

  test('its message teaches: what, why, fix and source for every issue', () => {
    const { message } = new TribuError({ kind: 'validation', issues: [issue] });
    expect(message).toContain('2800');
    expect(message).toContain('customer');
    expect(message).toContain(`Why: ${issue.why}`);
    expect(message).toContain(`Fix: ${issue.fix}`);
    expect(message).toContain(`Source: ${issue.source}`);
  });

  test('summarizes several issues in one message', () => {
    const { message } = new TribuError({
      kind: 'config',
      issues: [issue, { ...issue, path: 'series.receipt' }],
    });
    expect(message).toMatch(/2 problems/);
  });

  test('validation and rejection are not retryable; an unconfirmed submission is', () => {
    expect(new TribuError({ kind: 'validation', issues: [issue] }).retryable).toBe(false);
    expect(new TribuError({ kind: 'rejected', issues: [issue] }).retryable).toBe(false);
    expect(new TribuError({ kind: 'unconfirmed', issues: [issue] }).retryable).toBe(true);
  });

  test('carries the record when there is one', () => {
    const record = { id: 'F001-1' };
    expect(new TribuError({ kind: 'unconfirmed', issues: [issue], record }).record).toBe(record);
  });

  test('never prints secrets, even if an issue mentions them', () => {
    const error = new TribuError({
      kind: 'config',
      issues: [{ ...issue, path: 'sol.password' }],
      context: { sol: { user: 'FACTURADOR', password: 'secret-password' } },
    });
    expect(error.message).not.toContain('secret-password');
    expect(inspect(error, { depth: 10 })).not.toContain('secret-password');
    expect(JSON.stringify(error)).not.toContain('secret-password');
  });
});
