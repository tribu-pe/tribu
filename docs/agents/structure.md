# Structure and context

What Tribu is made of and how its pieces relate. The layout below is the **target**; nothing exists under `src/` yet. Words in capitals are defined in [GLOSSARY.md](../../GLOSSARY.md).

## The idea in one paragraph

A Document is data, and every step turns it into other data: input → calculated Document → XML → signed XML → SUNAT's answer → Record. Every step up to the XML is a pure function. Only the signing (Certificate) and the sending (network) touch the outside world. Tribu stores nothing: each operation returns a plain JSON Record that the caller saves (ADR 0008).

## Repository layout

```
src/
  catalogs/            Domain          SUNAT code lists: data files + generated constants (Catalog.define)
    data/*.yaml                        the source of truth, edited by people; types and docs are generated
    documents/<doc>.ts                 catalogs owned by one document (Reason for credit-note / debit-note)
  documents/           Domain          Invoice, Receipt, CreditNote, DebitNote; calculate(); Value Objects; predicates
  rules/               Domain          one Rule per file (Rule.define); validate() is the rule engine
    <document>/<id>.ts + <id>.test.ts
  xml/                 Domain          build(): Document → UBL 2.1 XML, one typed function per UBL part
    parts/
  results/             Domain          Status (Lifecycle.define), TribuError, TribuRecord
  signing/             Infrastructure  sign(): XMLDSig with the Certificate
  transport/           Infrastructure  send() and read(): ZIP + SOAP to SUNAT, Tickets, recovery strategy
  testing/             Infrastructure  fakeSunat(), the public test double
  issue.ts             Application     the life of a Document, step by step (start reading here)
  create.ts            Application     tribu.create(): configuration, defaults, environment variables
  index.ts                             public entry point `tribu`
fixtures/
  <document>/<case>/input.json + expected.xml     golden tests
  rounding/                                       rounding cases verified in beta (Milestone 0)
test/
  beta/                manual or nightly runs against SUNAT beta; never blocks a pull request
  oracle/              manual comparison with the oracle implementation (ADR 0007)
poc/                   Milestone 0 only: throwaway, never published
docs/
  adr/                 decisions (ADR format: short, the "why")
  agents/              these agent guides
  plan/                scope and milestones
  research/            verified SUNAT facts with sources
GLOSSARY.md  AGENTS.md  README.md  README.es.md  CONTRIBUTING.md
```

## Layers and the dependency rule

| Layer | Folders | May import |
|---|---|---|
| Domain | `catalogs/`, `documents/`, `rules/`, `xml/`, `results/` | Domain only, with no network or file access |
| Application | `issue.ts`, `create.ts` | Domain and Infrastructure |
| Infrastructure | `signing/`, `transport/`, `testing/` | Domain |

Dependency-cruiser enforces this, so a violation fails CI. Also:

- big.js is imported only in `documents/decimal.ts`;
- there are no barrel files inside `src/`.

## The pipeline (`src/issue.ts`)

```ts
const document = calculate(input, config);            // input → Document (Value Objects, amounts)
validate(document, config.rules);                     // Rules in force on the issue date
const number = await config.nextNumber(document.series);   // only after validation: an error burns no Number
const xml = build({ ...document, number });           // Document → UBL 2.1
const signed = sign(xml, config.certificate);
const answer = await send(signed, config.transport);  // conservative recovery, ADR 0015
return record(document, signed, read(answer));        // → TribuRecord
```

## Public entry points (ADR 0017)

| Import | Contents |
|---|---|
| `tribu` | The client (`tribu.create`) plus everything below except per-document catalogs |
| `tribu/values` | `Money`, `Ruc`, `Dni`, `DocumentId` |
| `tribu/results` | `Status`, `TribuError`, `TribuRecord` |
| `tribu/catalogs`, `tribu/catalogs/<document>` | SUNAT catalogs; `Reason` only under its document |
| `tribu/testing` | `fakeSunat()` |

## Where a change goes

| SUNAT changed… | Edit | Also add |
|---|---|---|
| a catalog value or its dates | `src/catalogs/data/<catalog>.yaml` | regenerate; the CI checks it |
| whether a code is an error or an observation | the `ReturnCode` data (dated entry) | nothing else: Rule severity derives from it (ADR 0011) |
| a Rule or its Effective Date | `src/rules/<document>/<id>.ts` | its `<id>.test.ts` |
| an IGV rate | `src/catalogs/data/igv-regime.yaml` (dated line) | |
| an XML field | type in `documents/`, function in `xml/parts/` | a golden fixture |
| an endpoint or protocol | `src/transport/` | |
| a new document type | `documents/`, `xml/`, `rules/`, a method in `create.ts` | a minor version |

Each such change links to the SUNAT resolution or workbook entry that motivates it.

## Key context (details in the ADRs)

- **Amounts:** Tribu calculates them; each Item has `price` (tax included) or `value` (tax excluded). See ADR 0001.
- **IGV:** the Issuer declares an IGV Regime constant, never a rate. See ADR 0012.
- **Environment:** production is the default; beta is explicit. See ADR 0002.
- **Validation:** runs before sending; it blocks what SUNAT rejects and warns about what SUNAT only observes. See ADRs 0003 and 0011.
- **Receipts:** sent individually by default; `{ send: false }` holds them for a Daily Summary. See ADR 0010.
- **Status:** Tribu's own model, mapped only from SUNAT catalog entries. See ADR 0014.
- **Recovery:** retries only what never reached SUNAT; never re-sends blindly by default. See ADR 0015.
- **Options:** `rounding` and `signature` accept only constants verified in beta. See ADR 0018.
- **Out of v0.1:** detracciones, exports, ISC, ICBPER, free operations, the dispatch guide and PDF.
