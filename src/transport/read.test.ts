import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { ResponseCode } from '../catalogs/index';
import { readCdr } from './read';

const fixture = (name: string) =>
  readFileSync(new URL(`../../fixtures/sunat/${name}`, import.meta.url), 'utf8');

// Manual del Programador, Annex 1: cbc:ResponseCode is "0" when accepted, otherwise the error code.
describe('readCdr', () => {
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

  test.todo('SOAP faults carry exceptions 0100–1999: format to be confirmed in Milestone 0');
});
