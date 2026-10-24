import { describe, expect, test } from 'vitest';
import * as creditNote from './catalogs/documents/credit-note';
import * as catalogs from './catalogs/index';
import * as root from './index';
import * as results from './results';
import * as testing from './testing/index';
import * as values from './values';

// ADR 0017: five entry points, grouped by when they are used.
describe('public entry points', () => {
  test('tribu: the default export creates a client', () => {
    expect(typeof root.default.create).toBe('function');
  });

  test('tribu/values: the Value Objects', () => {
    expect(Object.keys(values).sort()).toEqual(['DocumentId', 'Dni', 'Money', 'Ruc']);
  });

  test('tribu/results: what comes back', () => {
    expect(Object.keys(results).sort()).toEqual(['Status', 'TribuError']);
  });

  test('tribu/catalogs: the shared SUNAT catalogs', () => {
    expect(Object.keys(catalogs).sort()).toEqual(
      [
        'Affectation',
        'Currency',
        'DocumentType',
        'Identity',
        'Igv',
        'ResponseCode',
        'ReturnCode',
        'TicketStatus',
        'Unit',
      ].sort(),
    );
  });

  test('tribu/catalogs/credit-note: its Reason', () => {
    expect(Object.keys(creditNote)).toEqual(['Reason']);
  });

  test('tribu/testing: the fake SUNAT', () => {
    expect(Object.keys(testing)).toEqual(['fakeSunat']);
  });

  test('tribu re-exports everything except per-document catalogs', () => {
    for (const name of [
      ...Object.keys(values),
      ...Object.keys(results),
      ...Object.keys(catalogs),
    ]) {
      expect(root, name).toHaveProperty(name);
    }
    expect(root).toHaveProperty('Rounding');
    expect(root).toHaveProperty('Signature');
    expect(root).toHaveProperty('Recovery');
    expect(root).not.toHaveProperty('Reason'); // two catalogs define one (ADR 0013)
  });

  test('the same class whichever path it was imported from, so instanceof works', () => {
    expect(root.Ruc).toBe(values.Ruc);
    expect(root.TribuError).toBe(results.TribuError);
    expect(root.Igv).toBe(catalogs.Igv);
  });
});
