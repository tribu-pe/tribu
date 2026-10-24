import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { C14nCanonicalization } from 'xml-crypto';
import { DocumentType } from '../../src/catalogs/index';
import { calculate } from '../../src/documents/calculate';
import { build } from '../../src/xml/build';
import { settings } from '../support/documents';
import { parseXml } from '../support/xml';

// Golden tests: fixtures/<document>/<case>/{input.json, expected.xml}. Each expected.xml must come from
// a document SUNAT beta accepted (Milestone 0); never write one by hand. Compared after canonicalization,
// so attribute order and insignificant formatting do not matter.
const fixtures = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const documents = {
  invoice: DocumentType.Invoice,
  receipt: DocumentType.Receipt,
  'credit-note': DocumentType.CreditNote,
  'debit-note': DocumentType.DebitNote,
};

function canonical(xml: string) {
  return new C14nCanonicalization().process(parseXml(xml), {}).toString();
}

const cases = Object.entries(documents).flatMap(([folder, type]) => {
  const directory = `${fixtures}${folder}/`;
  if (!existsSync(directory)) return [];
  return readdirSync(directory).map((name) => ({
    folder,
    name,
    type,
    directory: `${directory}${name}/`,
  }));
});

describe('golden XML', () => {
  test.each(cases)('$folder/$name', ({ directory, type }) => {
    const {
      settings: overrides = {},
      number,
      ...input
    } = JSON.parse(readFileSync(`${directory}input.json`, 'utf8'));
    const document = { ...calculate(type, input, settings(overrides)), number };
    expect(canonical(build(document))).toBe(
      canonical(readFileSync(`${directory}expected.xml`, 'utf8')),
    );
  });

  if (cases.length === 0)
    test.todo('add fixtures from the documents SUNAT beta accepts in Milestone 0');
});
