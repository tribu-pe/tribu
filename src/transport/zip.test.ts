import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, test } from 'vitest';
import { unzipXml, zipDocument } from './zip';

// SUNAT receives a ZIP holding one XML with the same base name (Manual del Programador, sendBill).
describe('zip', () => {
  test('packs the XML under the file name', () => {
    const files = unzipSync(zipDocument('20000000001-01-F001-123', '<Invoice/>'));
    expect(Object.keys(files)).toEqual(['20000000001-01-F001-123.xml']);
    expect(strFromU8(files['20000000001-01-F001-123.xml'] ?? new Uint8Array())).toBe('<Invoice/>');
  });

  test('round trips the exact bytes, so the signature still verifies', () => {
    const xml = '<Invoice>Señor &amp; Cía</Invoice>';
    expect(unzipXml(zipDocument('20000000001-01-F001-1', xml))).toBe(xml);
  });
});
