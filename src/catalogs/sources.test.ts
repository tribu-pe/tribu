import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { Reason as CreditReason } from './documents/credit-note';
import { Reason as DebitReason } from './documents/debit-note';
import { Affectation, DocumentType, Identity } from './index';

// ADR 0005: SUNAT's CSVs are the source of truth. Catalogs 01, 06, 07, 09 and 10 are transcribed
// by hand (only the entries Tribu uses, under English names), so this test holds each one to the CSV.
const CSV = 'sources/sunat/reglas-validacion-2026-08-26/catalogos.csv';

/** The whole CSV → rows of raw cells; a quoted cell may hold commas, doubled quotes and newlines. */
function parse(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if (character === '\n' && !quoted) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

const tidy = (value: string): string => value.replace(/\s+/g, ' ').trim();
const raw = parse(readFileSync(CSV, 'utf8'));

/** Raw rows of catalog `number`: everything between its "No.,NN" header and the next one. */
function rawRowsOf(number: string): string[][] {
  const isHeader = (row: string[]) => tidy(row[0] ?? '') === 'No.';
  const start = raw.findIndex((row) => isHeader(row) && tidy(row[1] ?? '') === number);
  if (start === -1) throw new Error(`catalogos.csv has no catalog ${number}.`);
  const next = raw.findIndex((row, index) => index > start && isHeader(row));
  return raw.slice(start + 1, next === -1 ? undefined : next);
}

function rowsOf(number: string): string[][] {
  return rawRowsOf(number).map((row) => row.map(tidy));
}

/**
 * The wordings SUNAT gives a code. A cell may hold several, one per line: catalog 09 code 03
 * carries its original wording and a later one; Tribu uses the later one.
 */
function sunatNames(number: string, code: string): string[] {
  const cell = rawRowsOf(number).find((row) => tidy(row[0] ?? '') === code)?.[1];
  return cell === undefined ? [] : [tidy(cell), ...cell.split('\n').map(tidy)];
}

describe.each([
  ['01', DocumentType],
  ['06', Identity],
  ['07', Affectation],
  ['09', CreditReason],
  ['10', DebitReason],
])('catalog %s matches catalogos.csv', (number, catalog) => {
  test.each(catalog.all().map((entry) => [entry.code, entry.name]))('%s %s', (code, name) => {
    expect(sunatNames(number, code)).toContain(tidy(name));
  });
});

describe('catalog 07: each Tax Affectation names a tribute of catalog 05', () => {
  test.each(Affectation.all().map((entry) => [entry.code, entry]))('%s', (code, entry) => {
    const allowed =
      rowsOf('07')
        .find((row) => row[0] === code)?.[2]
        ?.split(' o ') ?? [];
    const scheme = entry.taxScheme;
    expect(scheme).toBeDefined();
    expect(allowed).toContain(scheme?.code);
    // Catalog 05 columns: code, description, international code, name.
    const tribute = rowsOf('05').find((row) => row[0] === scheme?.code);
    expect(tribute?.[2]).toBe(scheme?.international);
    expect(tribute?.[3]).toBe(scheme?.name);
  });
});
