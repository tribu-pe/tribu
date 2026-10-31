import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { ResponseCode } from '../catalogs/index';
import { readCdr } from './read';
import { unzipXml } from './zip';

const fixture = (name: string) =>
  readFileSync(new URL(`../../fixtures/sunat/${name}`, import.meta.url), 'utf8');

// Manual del Programador, Annex 1: cbc:ResponseCode is "0" when accepted, otherwise the error code.
describe('readCdr', () => {
  // A real CDR from SUNAT beta (Milestone 0): root ar:ApplicationResponse, signed by SUNAT.
  test('an accepted Invoice from SUNAT beta', () => {
    const zip = readFileSync(
      new URL('../../fixtures/sunat/beta/invoice-accepted.zip', import.meta.url),
    );
    const cdr = readCdr(unzipXml(zip));
    expect(cdr.code).toBe('0');
    expect(cdr.response).toBe(ResponseCode.Accepted);
    expect(cdr.documentId).toMatch(/^F001-\d+$/);
    expect(cdr.description).toMatch(/ha sido aceptada$/);
    expect(cdr.observations).toEqual([]);
  });

  test('an accepted CDR with observations', () => {
    const cdr = readCdr(fixture('cdr-accepted-with-observations.xml'));
    expect(cdr.documentId).toBe('FA01-981');
    expect(cdr.code).toBe('0');
    expect(cdr.response).toBe(ResponseCode.Accepted);
    expect(cdr.description).toBe('La Factura numero FA01-981, ha sido aceptada');
    expect(cdr.observations).toEqual([
      { code: '4031', message: 'Debe indicar el nombre comercial' },
      { code: '4001', message: 'El numero de RUC del receptor no existe.' },
    ]);
  });

  test('a rejected CDR', () => {
    const cdr = readCdr(fixture('cdr-rejected.xml'));
    expect(cdr.documentId).toBe('FT01-982');
    expect(cdr.code).toBe('2047');
    expect(cdr.response).toBe(ResponseCode.Rejection);
    expect(cdr.observations).toEqual([]);
  });

  test('keeps the original XML for the Record', () => {
    const xml = fixture('cdr-rejected.xml');
    expect(readCdr(xml).xml).toBe(xml);
  });

  test('malformed XML is not a CDR', () => {
    expect(() => readCdr('<not-a-cdr')).toThrow();
  });

  // SOAP faults are read in transport/sunat.ts; beta confirmed soap-env:Client.<code> (sunat.test.ts).
});
