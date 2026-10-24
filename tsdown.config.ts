import { defineConfig } from 'tsdown';

// One entry per public entry point (ADR 0017).
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    values: 'src/values.ts',
    results: 'src/results.ts',
    catalogs: 'src/catalogs/index.ts',
    'catalogs/credit-note': 'src/catalogs/documents/credit-note.ts',
    'catalogs/debit-note': 'src/catalogs/documents/debit-note.ts',
    testing: 'src/testing/index.ts',
  },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  dts: true,
  clean: true,
});
