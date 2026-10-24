# Code style

How to write code in Tribu. The full conventions are in [docs/conventions.md](../conventions.md), and they win if anything here disagrees. The goal behind every rule: **someone who has never issued an invoice learns SUNAT by reading the code.**

## Names

- Use the [GLOSSARY.md](../../GLOSSARY.md) term, unabbreviated, everywhere: in the API, the internals, errors and tests.
- SUNAT acronyms stay as they are: RUC, DNI, IGV, CDR, SOL, UBL, ubigeo.
- Use the `Tribu` prefix only where a name clashes: `TribuRecord` (TypeScript has `Record<K, V>`), `TribuConfig`, `TribuError`.
- File names are kebab-case: `customer-has-ruc.ts`.

```ts
// ✅
items: [{ description: 'Teclado', quantity: 2, price: 118 }]
customer: { ruc: '20123456789', name: 'CLIENTE SAC' }

// ❌  qty (abbreviation), name (not SUNAT's term), to (not the glossary's Customer)
items: [{ name: 'Teclado', qty: 2, price: 118 }]
to: { ruc: '20123456789' }
```

## Pipeline verbs

Each verb below has one fixed meaning:

| Verb | Means |
|---|---|
| `calculate` | input → Document |
| `validate` | apply the Rules |
| `build` | Document → XML |
| `sign` | sign the XML |
| `send` | deliver to SUNAT |
| `read` | SUNAT's answer → data |
| `from` | an external value → constant or Value Object, or throw |
| `X.define` | `Catalog.define`, `Rule.define`, `Lifecycle.define` |

Never use `emit`, `submit`, `generate`, `parse` (except `DocumentId.parse`), `compute`, or `create*` for these steps.

## SUNAT codes: constants only

```ts
// ✅
import { Affectation, DocumentType } from '../catalogs';
appliesTo: [DocumentType.Invoice]
affectation: Affectation.Exempt
const reason = Reason.from(row.reasonCode);   // external value: validated or throws

// ❌
appliesTo: ['01']
affectation: '20'
```

- Catalogs are declared with `Catalog.define(name, { source, entries })`, and only for data SUNAT publishes.
- Each entry's `name` is SUNAT's wording, verbatim.
- Give the `source` once per catalog, and make it precise (a manual section, a workbook sheet or a resolution).
- Tribu's own models (Status) use `Lifecycle.define`.

## Money, dates and values

- Never use `number` arithmetic for money. Every amount is a `Decimal` or `Money`. Only `documents/decimal.ts` imports big.js.
- Round once, per Item, at the end of its own calculation. The Unit Value stays unrounded. The header totals are the sums of the Items (ADR 0001).
- Dates are `YYYY-MM-DD` strings, interpreted in Lima time. Never use `Date` or the server's clock for an issue date.
- After `calculate`, code sees only Value Objects (`Ruc`, `Dni`, `Money`, `DocumentId`), never a raw string for a RUC.
- Documents are immutable plain data, not classes. They must round-trip through JSON (ADR 0016).
- No option accepts a free value that changes tax, rounding or signature. Those take verified constants only (ADRs 0012 and 0018).

## Rules

Write one Rule per file, with its test beside it:

```ts
// src/rules/invoice/customer-has-ruc.ts
import { Rule } from '../rule';
import { DocumentType } from '../../catalogs';
import { hasRuc } from '../../documents/predicates';

/** Invoices require a RUC customer. ERR 2800 */
export const customerHasRuc = Rule.define({
  id: 'invoice/customer-has-ruc',          // = folder/file name, phrased as what must hold
  appliesTo: [DocumentType.Invoice],
  sunatCode: '2800',                       // severity derives from it (ADR 0011); no `severity` field
  effectiveFrom: '2018-01-01',
  why: 'Only invoices give IGV tax credit, so the buyer must have a RUC.',
  fix: 'Use sunat.receipt(...) for customers without RUC.',
  source: 'Reglas de validación · Factura2_0',
  check: (invoice) => hasRuc(invoice.customer) || { path: 'customer' },
});
```

```ts
// src/rules/invoice/customer-has-ruc.test.ts
test('rejects an invoice whose customer has a DNI instead of a RUC', () => { /* … */ });
test('accepts an invoice whose customer has a RUC', () => { /* … */ });
```

- Put shared conditions in `documents/predicates.ts` as plain functions. Don't write Specification classes.
- Every Rule mirrors a SUNAT code. Tribu's own safeguards, such as test credentials in production, are configuration checks, not Rules.

## Errors

```ts
throw new TribuError({
  kind: 'validation',                 // config | validation | rejected | unconfirmed | exception
  retryable: false,
  issues: [{ code: '2800', path: 'customer', why, fix, source }],
});
```

- Collect every issue, then throw once. Don't make the user fix problems one at a time.
- An error says what happened, why SUNAT requires it, how to fix it, and the source.
- Never print with `console`. Warnings go to `warnings` or to the optional logger.
- Never put the SOL password, the Certificate or its passphrase in an error, a log or a Record. Redact them as `'[REDACTED]'`.

## Comments: short, with references

```ts
/** IGV total = Σ item IGV (±1 tolerated). ERR 3291 · ADR 0001 · /Invoice/cac:TaxTotal */
export const taxTotal = (document: Document) => …
```

- One line stating SUNAT's requirement, followed by references (code, resolution, ADR, XPath). Don't paste the reference itself.
- The first time a file uses a SUNAT term, give the Spanish in parentheses: *Unit Value (valor unitario)*.
- XML parts cite their annex field and XPath.
- Never restate the code. Write in English.

## Modules

- Use named exports only. The one default export is `tribu` in `src/index.ts`.
- No barrel `index.ts` inside `src/`; one exists only at each public entry point (ADR 0017).
- Respect the layers: Domain never imports `signing/` or `transport/` ([structure.md](./structure.md)).

## Tests

- Test names are sentences describing behaviour.
- Golden tests compare **canonicalized** XML, never raw strings.
- Tests use `fakeSunat()`. Tests against SUNAT beta live in `test/beta/` and never run in the required CI.
- Fixtures contain only generated test certificates and SUNAT's public beta credentials.

## Before you finish a change

- [ ] Every name matches the glossary; any new term was added to `GLOSSARY.md`.
- [ ] No raw SUNAT code, no `number` arithmetic on money, no `Date` for issue dates.
- [ ] Every SUNAT fact in code or comments cites its source; anything unverified is marked *unconfirmed*.
- [ ] A new Rule has `why`, `fix`, `source`, `sunatCode`, `effectiveFrom` and its test.
- [ ] The change follows the relevant ADRs. If it changes a decision, an ADR was added or amended and the maintainer approved it.
- [ ] No secrets in code, fixtures, logs or errors.
- [ ] The commands in `AGENTS.md` pass. Until tooling exists, there are none, so say so instead of inventing them.
