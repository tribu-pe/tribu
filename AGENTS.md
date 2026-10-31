# AGENTS.md

Tribu is an open-source TypeScript SDK for issuing Peruvian electronic payment documents (comprobantes de pago electrónicos) to SUNAT, the Peruvian tax authority. It aims to be simple to use, in the spirit of Axios and Rails. Its code should teach SUNAT to someone who has never issued an invoice, and absorbing SUNAT's changes should mean editing data, not code.

## Status

**v0.1 is implemented and Milestone 0 is done:** every document type and report is accepted by SUNAT beta ([docs/research/milestone-0-results.md](docs/research/milestone-0-results.md)). `pnpm check` and `pnpm build` pass; `pnpm test:beta` passes against beta. It is published to npm only under the `experimental` tag (`publishConfig` in `package.json`, versions `0.1.0-experimental.N`). npm also pointed `latest` at the first experimental version, since it was the package's first publish; a stable v0.1 waits until someone verifies it in production ([docs/plan/v0.1-scope.md](docs/plan/v0.1-scope.md)).

Tooling is configured. **Never invent commands:** these are the only ones.

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies. Versions younger than 7 days are refused (`minimumReleaseAge` in `pnpm-workspace.yaml`) |
| `pnpm typecheck` | `tsc --noEmit` (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| `pnpm lint` / `pnpm format` | Biome check / check and fix |
| `pnpm deps` | dependency-cruiser layer rules (`.dependency-cruiser.cjs`). Fails until `src/` exists |
| `pnpm test` | Vitest, `unit` project: `src/**/*.test.ts` and `test/golden/` |
| `pnpm test:beta` | Vitest, `beta` project: `test/beta/`, against SUNAT beta. Manual only |
| `pnpm catalogs` | Regenerate `src/catalogs/data/` from the SUNAT CSVs in `sources/sunat/` (ADR 0005) |
| `pnpm catalogs:check` | Fail if `src/catalogs/data/` differs from what the CSVs produce |
| `pnpm check` | typecheck + lint + deps + catalogs:check + test |
| `pnpm build` | tsdown, one entry per public entry point (`tsdown.config.ts`). Fails until those files exist |
| `pnpm changeset` | Record a user-facing change |

Toolchain: Node ≥ 22.12 (`.node-version`: 24), pnpm 12, TypeScript 6.0 (not 7: dependency-cruiser supports TypeScript < 7), ESM only, `moduleResolution: Bundler` (relative imports without extensions).

Runtime dependencies:

| Package | Use |
|---|---|
| `big.js` | `Decimal`, only in `src/documents/decimal.ts` |
| `xml-crypto` + `node-forge` | Signing, only in `src/signing/` |
| `@xmldom/xmldom` | Reading signed XML and SUNAT answers, only in `src/signing/` and `src/transport/` |
| `fflate` | ZIP, only in `src/transport/` |

The rules in `.dependency-cruiser.cjs` and `biome.json` enforce where each package may be imported.

## Read before working

| File | What it gives you |
|---|---|
| [GLOSSARY.md](GLOSSARY.md) | The domain vocabulary. Use these terms and none of the ones listed under *Avoid* |
| [docs/agents/structure.md](docs/agents/structure.md) | Repository layout, layers, the pipeline, and where each kind of change goes |
| [docs/agents/code-style.md](docs/agents/code-style.md) | How to write code here, with examples and a pre-commit checklist |
| [docs/conventions.md](docs/conventions.md) | The full conventions; they win if anything else disagrees |
| [docs/adr/](docs/adr) | Why things are the way they are (0001–0019). Read the relevant ADR before changing a design |
| [docs/research/sunat-facts-2026-10.md](docs/research/sunat-facts-2026-10.md) | Verified SUNAT facts, with sources |
| [docs/research/milestone-0-results.md](docs/research/milestone-0-results.md) | What SUNAT beta answered, with the tests that prove it |
| [sources/sunat/](sources/sunat) | SUNAT's validation workbook as CSV (rules, return codes, catalogs). Search here before anything else; cite it as `sources/sunat/reglas-validacion-2026-08-26/<file>.csv` |

## Rules for agents

1. **SUNAT facts need a source.** Never write a SUNAT code, deadline, rate or format from memory. Take it from `docs/research/` or from an official source (sunat.gob.pe, cpe.sunat.gob.pe, El Peruano), and cite it. Mark anything unverified as *unconfirmed*.
2. **Don't silently change a decision.** If a task conflicts with an ADR, stop and say so. A changed decision needs a new or amended ADR, approved by the maintainer.
3. **Keep the glossary current.** When a domain term is introduced or sharpened, update `GLOSSARY.md` in the same change. It holds definitions only, never implementation details.
4. **Don't name other SDKs or projects in repository documents.** Refer to them generically ("an implementation", "the oracle implementation").
5. **Secrets never enter the repository or the logs.** That covers the SOL password, real certificates (`.pfx`/`.p12`) and their passphrases. Use only generated test certificates and SUNAT's public beta credentials.
6. **Code, comments and docs are in English.** The Spanish documents are `README.es.md`, `CONTRIBUTING.es.md` and `docs/guide/es/`; change them together with their English versions.
7. **Commit or push only when asked.** Never work directly on `main`.
