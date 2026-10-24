# Code conventions

The rules every contribution follows. The domain words themselves are defined in [GLOSSARY.md](../GLOSSARY.md); the reasons behind the larger decisions are in [docs/adr](./adr).

## Names in the public API

- Use the glossary term, unabbreviated, everywhere: in the API, inside the code, in errors and in docs. Write `customer`, not `to`. Write `quantity`, not `qty`.
- An Item is `{ description, quantity, price | value }`. Optional fields are `unit` and `affectation`.
  - `price` is the Unit Price, tax included.
  - `value` is the Unit Value, tax excluded.
  - An Item has exactly one of them.
- SUNAT acronyms stay as they are: RUC, DNI, IGV, CDR, SOL, UBL, ubigeo.

## Value Objects

- `Money`, `Ruc`, `Dni` and `DocumentId` exist only when valid.
- The public API accepts either primitives or Value Objects.
- `calculate` turns every input into Value Objects as its first step. Code after it (`rules/`, `xml/`, …) never sees a raw string for a RUC or a number for money.
- Dates are `YYYY-MM-DD` strings, always interpreted in Lima time.

## Catalogs

- Shared catalogs are imported from `tribu/catalogs`; a catalog that belongs to one document comes from `tribu/catalogs/<document>` (ADR 0013).
- Constants are PascalCase, at most two levels deep, and translate SUNAT's official name.
- Every constant is a frozen `{ catalog, code, name }` object. A value from outside the code (a database row, JSON) goes through `X.from(code)`, which throws if the code is unknown.
- Never write a raw catalog code (`'01'`, `'07'`) in code. Use the constant.

## Errors

- One class, `TribuError`, with `kind`: `config`, `validation`, `rejected` or `unconfirmed`.
- It also carries `retryable`, the `record` when one exists, and `issues[]`.
- Each issue has:
  - `code`: SUNAT's code;
  - `path`: the input field that caused it, such as `items[2].price`;
  - `why`, `fix` and `source`.

## Rules

- One file per Rule: `src/rules/<document>/<id>.ts`, declared with `Rule.define`; its `id` equals the path (`invoice/customer-has-ruc`). Shared conditions are predicate functions in `src/documents/predicates.ts` (ADR 0016).
- The `id` states what must hold, in positive form (`customer-has-ruc`, not `no-dni-in-invoice`).
- Required fields:
  - `appliesTo`: document constants;
  - `sunatCode`;
  - `effectiveFrom`;
  - `why`, `fix` and `source`;
  - `check`.
- `effectiveTo` is optional.
- There is no `severity` field. It is derived from `sunatCode` (ADR 0011).
- `check` returns `true`, or an issue with its `path`.
- A test file sits next to every Rule (`<id>.test.ts`). Test names are sentences: `rejects an invoice whose customer has a DNI instead of a RUC`. A Rule without a test fails CI.

## Type names

| Concept | Type |
|---|---|
| What the user writes | `InvoiceInput`, `ReceiptInput`, `CreditNoteInput`, `DebitNoteInput` |
| The calculated document | `Invoice`, `Receipt`, `CreditNote`, `DebitNote`; `Document` is the union of all four |
| The Record | `TribuRecord` (TypeScript already has a global `Record<K, V>`); the property is still `record` |
| Validated client configuration | `TribuConfig` |
| Per-call options | `CallOptions` |
| One problem inside an error | `Issue` |

Use the `Tribu` prefix only where a name would clash, as Axios does with `AxiosError`.

## Tests

| Kind | Where | Runs |
|---|---|---|
| Unit | next to the file (`<name>.test.ts`) | every commit |
| Golden | `fixtures/<document>/<case>/input.json` + `expected.xml`, compared after XML canonicalization | every commit |
| Rounding | `fixtures/rounding/` | every commit |
| SUNAT beta | `test/beta/` | manually or nightly; never blocks a pull request |
| Oracle comparison | `test/oracle/` | manually |

`tribu/testing` exposes `fakeSunat()` publicly, and Tribu's own tests use it too.

## Files and exports

- File names are kebab-case.
- Use named exports only. The one exception is the `tribu` default export.
- No barrel files inside `src/`. An `index.ts` exists only at a public entry point.

## Comments

- Keep comments short. A comment states SUNAT's requirement in one line and points to the reference; it does not paste the reference in.
- Write `ERR 3291`, `R.S. 097-2012 art. 12`, `ADR 0001`, or the annex XPath.
- The first time a file uses a SUNAT term, give the Spanish in parentheses: *Unit Value (valor unitario)*.
- Never restate what the code does.
- Write comments in English.

```ts
/** IGV total = Σ item IGV (±1 tolerated). ERR 3291 · ADR 0001 · /Invoice/cac:TaxTotal */
```

## Pipeline verbs

| Verb | Always means | Never use |
|---|---|---|
| `calculate` | input → Document with amounts | compute, process |
| `validate` | apply the Rules | check (reserved for `rule.check`) |
| `build` | Document → XML | generate, render, serialize |
| `sign` | sign the XML | |
| `send` | deliver to SUNAT | submit, post, emit |
| `read` | SUNAT answer → data | parse, decode |
| `from` | external value → constant or Value Object, or throw | of, create, parse (except `DocumentId.parse`) |
| `X.define` | declare Catalogs (`Catalog.define`) and Rules (`Rule.define`) | create*, defineX |

The life of a document is `src/issue.ts` (`issue()`), not `emit`: in programming English, "emit" means firing an event.
