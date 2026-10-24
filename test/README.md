# Tests

The v0.1 test suite was written **before** the code, as its specification. Until each module exists, its tests fail: Vitest reports missing modules, and `pnpm typecheck` reports the same imports. That is expected on this branch. The work is done when `pnpm check` passes.

## Layout

| Where | What | Runs |
|---|---|---|
| `src/**/<name>.test.ts` | Unit tests next to each module. Each Rule has its own `<id>.test.ts`, and `src/rules/registry.test.ts` fails if one is missing | `pnpm test` |
| `src/{create,issue,notes,reporting,recovery,public-api}.test.ts` | The public API end to end, against `fakeSunat()` | `pnpm test` |
| `test/golden/` | `fixtures/<document>/<case>/` input → expected XML, compared after canonicalization | `pnpm test` |
| `test/support/` | Helpers: a generated test Certificate, test clients, document builders, XML queries | |
| `test/beta/` | Against SUNAT beta, during Milestone 0 | `pnpm test:beta`, manually |
| `fixtures/sunat/` | CDR examples from SUNAT's manual, until real ones exist | |

## Where expected values come from

Every SUNAT value a test asserts is cited in the test, from these sources:

- `sources/sunat/reglas-validacion-2026-08-26/`: codes, severities, catalog names (verbatim) and XML paths;
- `docs/research/sunat-facts-2026-10.md`: deadlines, rates, QR format, endpoints;
- the ADRs: Tribu's own decisions.

Nothing is asserted from memory. Where Milestone 0 has not yet answered a question, the test is a `test.todo` that names the question.

## Interpretations these tests pin down

They follow from the ADRs, but a reader could otherwise wonder:

- **Tax-included lines:** total = price × quantity; value = round(total / (1 + rate)); IGV = total − value. One unit at S/ 10.00 is 8.47 + 1.53 = 10.00, the amount the customer paid. With `value` input, IGV = round(value × rate). See ADR 0001.
- **Certificate expiry warning:** 30 days before `notAfter`.
- **Catalog constant for document types:** `DocumentType` (catalog 01), not `Document`, which is the union type of the four documents.
- **Option constants:** `Rounding`, `Signature` and `Recovery` live in `src/options.ts` and are exported from `tribu`. They are Tribu's options, not SUNAT catalogs.
