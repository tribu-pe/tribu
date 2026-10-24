import { describe, expect, test } from 'vitest';
import {
  Affectation,
  Currency,
  DocumentType,
  Identity,
  ResponseCode,
  TicketStatus,
  Unit,
} from './index';

// Names are SUNAT's wording, verbatim:
// sources/sunat/reglas-validacion-2026-08-26/catalogos.csv
describe('catalog 01: DocumentType', () => {
  test.each([
    [DocumentType.Invoice, '01', 'Factura'],
    [DocumentType.Receipt, '03', 'Boleta de venta'],
    [DocumentType.CreditNote, '07', 'Nota de crédito'],
    [DocumentType.DebitNote, '08', 'Nota de débito'],
  ])('%o', (entry, code, name) => {
    expect(entry).toMatchObject({ code, name });
  });
});

describe('catalog 06: Identity', () => {
  test.each([
    [Identity.NonDomiciledWithoutRuc, '0', 'DOC.TRIB.NO.DOM.SIN.RUC'],
    [Identity.Dni, '1', 'Documento Nacional de Identidad'],
    [Identity.ForeignerId, '4', 'Carnet de extranjería'],
    [Identity.Ruc, '6', 'Registro Unico de Contributentes'], // SUNAT's spelling, kept as is
    [Identity.Passport, '7', 'Pasaporte'],
    [Identity.DiplomaticId, 'A', 'Cédula Diplomática de identidad'],
  ])('%o', (entry, code, name) => {
    expect(entry).toMatchObject({ code, name });
  });
});

describe('catalog 07: Affectation', () => {
  test.each([
    [Affectation.Taxed, '10', 'Gravado - Operación Onerosa'],
    [Affectation.Exempt, '20', 'Exonerado - Operación Onerosa'],
    [Affectation.Unaffected, '30', 'Inafecto - Operación Onerosa'],
  ])('%o', (entry, code, name) => {
    expect(entry).toMatchObject({ code, name });
  });

  test('knows its catalog 05 tax scheme', () => {
    expect(Affectation.Taxed.taxScheme).toMatchObject({
      code: '1000',
      name: 'IGV',
      international: 'VAT',
    });
    expect(Affectation.Exempt.taxScheme).toMatchObject({
      code: '9997',
      name: 'EXO',
      international: 'VAT',
    });
    expect(Affectation.Unaffected.taxScheme).toMatchObject({
      code: '9998',
      name: 'INA',
      international: 'FRE',
    });
  });
});

describe('catalog 03: Unit', () => {
  test('goods and services', () => {
    expect(Unit.Goods).toMatchObject({ code: 'NIU', name: 'UNIDAD (BIENES)' });
    expect(Unit.Service).toMatchObject({ code: 'ZZ', name: 'UNIDAD (SERVICIOS)' });
  });
});

describe('catalog 02: Currency', () => {
  test('soles and dollars', () => {
    expect(Currency.Pen.code).toBe('PEN');
    expect(Currency.Usd.code).toBe('USD');
  });
});

describe('ResponseCode: classes of SUNAT answers (Manual del Programador §4.1)', () => {
  test.each([
    ['0', ResponseCode.Accepted],
    ['0102', ResponseCode.SunatException],
    ['0999', ResponseCode.SunatException],
    ['1033', ResponseCode.ContributorException],
    ['2108', ResponseCode.Rejection],
    ['3999', ResponseCode.Rejection],
    ['4031', ResponseCode.Observation],
  ])('%s is %o', (code, entry) => {
    expect(ResponseCode.classify(code)).toBe(entry);
  });
});

describe('TicketStatus (Manual del Programador §2.5)', () => {
  test.each([
    [TicketStatus.Processed, '0', 'Procesó correctamente'],
    [TicketStatus.InProgress, '98', 'En proceso'],
    [TicketStatus.ProcessedWithErrors, '99', 'Proceso con errores'],
  ])('%o', (entry, code, name) => {
    expect(entry).toMatchObject({ code, name });
  });
});
