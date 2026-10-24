import { describe, expect, test } from 'vitest';
import { TribuError } from '../results/tribu-error';
import { ReturnCode } from './index';

// Generated from sources/sunat/reglas-validacion-2026-08-26/codigos-retorno.csv,
// with severities from the document sheets and dates from control-de-cambios.csv.
describe('ReturnCode', () => {
  test('carries the official message', () => {
    expect(ReturnCode.from('2108').name).toBe('Presentacion fuera de fecha');
    expect(ReturnCode.from('4443').name).toBe(
      'El comprobante fue informado fuera del plazo establecido',
    );
  });

  test('covers the whole list', () => {
    expect(ReturnCode.all().length).toBeGreaterThanOrEqual(2077);
  });

  test.each([
    ['2108', 'error'],
    ['2800', 'error'],
    ['3286', 'error'],
    ['4443', 'observation'],
    ['4368', 'observation'],
  ])('%s is an %s', (code, severity) => {
    expect(ReturnCode.from(code).severityOn('2026-10-23')).toBe(severity);
  });

  test('3496 is an observation until 2026-12-31 and an error from 2027-01-01', () => {
    const code = ReturnCode.from('3496');
    expect(code.severityOn('2026-12-31')).toBe('observation');
    expect(code.severityOn('2027-01-01')).toBe('error');
  });

  test('throws for a code SUNAT does not define', () => {
    expect(() => ReturnCode.from('9999')).toThrow(TribuError);
  });
});
