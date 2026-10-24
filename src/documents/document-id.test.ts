import { describe, expect, test } from 'vitest';
import { TribuError } from '../results/tribu-error';
import { DocumentId } from './document-id';

// Series-number format: [F|B][A-Z0-9]{3}-[0-9]{1,8} (ERR 1001,
// sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv).
describe('DocumentId', () => {
  test('parses series and number', () => {
    const id = DocumentId.parse('F001-123');
    expect(id.series).toBe('F001');
    expect(id.number).toBe(123);
    expect(id.toString()).toBe('F001-123');
  });

  test('knows the document family from the series letter', () => {
    expect(DocumentId.parse('F001-1').family).toBe('invoice');
    expect(DocumentId.parse('BC01-1').family).toBe('receipt');
  });

  test.each([
    ['F01-123', 'series of 3 characters'],
    ['F001-123456789', 'number of 9 digits'],
    ['f001-1', 'lowercase series'],
    ['X001-1', 'series not starting with F or B'],
    ['F001-', 'missing number'],
    ['F001123', 'missing dash'],
  ])('rejects %s (%s)', (value) => {
    expect(() => DocumentId.parse(value)).toThrow(TribuError);
  });
});
