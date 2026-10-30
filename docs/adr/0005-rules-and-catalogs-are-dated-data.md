# Rules and Catalogs are dated data with a mandatory reason and source

SUNAT changes requirements with an Effective Date and sometimes postpones it (R.S. 000048-2026 moved from 2026-08-01 to 2027-01-01). Every Rule and Catalog entry therefore carries `why`, `source` and its Effective Dates, and is evaluated against the Document's issue date, not today's date. SUNAT's own validation workbook, kept as CSV in `sources/sunat/`, is the data: Tribu never maintains a second copy in another format, and `pnpm check` fails if the code drifts from it. Most SUNAT changes become a one-file pull request that doesn't touch the core. Catalog constants are immutable objects (`{ catalog, code, name }`), not bare strings, because catalogs 09 and 10 reuse the same codes with different meanings.

## Amendment (2026-10-30): from SUNAT's CSV straight to TypeScript

The original text had people edit YAML data files that a script turned into code. We dropped the YAML layer: hand-kept YAML is a transcription of the CSV that can drift from it, while the CSV is what SUNAT publishes. A new workbook version replaces the CSVs, and the code follows from them in one of two ways:

- **Generated**, when Tribu needs the whole list: the Return Codes and their dated severities (`src/catalogs/data/return-codes.ts`, written by `pnpm catalogs`). `pnpm catalogs:check` regenerates in memory and fails on any difference.
- **Transcribed**, when Tribu uses a few entries under English names that a script cannot invent (catalogs 01, 06 and 07 in `src/catalogs/shared.ts`; the Reasons of catalogs 09 and 10 in `src/catalogs/documents/`). A test (`src/catalogs/sources.test.ts`) holds each entry's code, name and tax scheme to `catalogos.csv`.
