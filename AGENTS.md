# AGENTS.md

Tribu is an open-source TypeScript SDK for issuing Peruvian electronic payment documents (comprobantes de pago electrónicos) to SUNAT, the Peruvian tax authority. It aims to be simple to use, in the spirit of Axios and Rails. Its code should teach SUNAT to someone who has never issued an invoice, and absorbing SUNAT's changes should mean editing data, not code.

## Status

**Design complete; no code yet.** The next step is Milestone 0 ([docs/plan/milestone-0.md](docs/plan/milestone-0.md)): a throwaway experiment in `poc/` that signs and sends documents to SUNAT beta. Then comes v0.1 ([docs/plan/v0.1-scope.md](docs/plan/v0.1-scope.md)).

No `package.json`, build, test or lint commands exist yet. **Never invent commands.** The stack is agreed (pnpm, tsdown, Vitest, Biome, dependency-cruiser, changesets, TypeScript strict, Node ≥ 22, ESM only). When you add the tooling, record the real commands here.

## Read before working

| File | What it gives you |
|---|---|
| [GLOSSARY.md](GLOSSARY.md) | The domain vocabulary. Use these terms and none of the ones listed under *Avoid* |
| [docs/agents/structure.md](docs/agents/structure.md) | Repository layout, layers, the pipeline, and where each kind of change goes |
| [docs/agents/code-style.md](docs/agents/code-style.md) | How to write code here, with examples and a pre-commit checklist |
| [docs/conventions.md](docs/conventions.md) | The full conventions; they win if anything else disagrees |
| [docs/adr/](docs/adr) | Why things are the way they are (0001–0018). Read the relevant ADR before changing a design |
| [docs/research/sunat-facts-2026-10.md](docs/research/sunat-facts-2026-10.md) | Verified SUNAT facts, with sources |

## Rules for agents

1. **SUNAT facts need a source.** Never write a SUNAT code, deadline, rate or format from memory. Take it from `docs/research/` or from an official source (sunat.gob.pe, cpe.sunat.gob.pe, El Peruano), and cite it. Mark anything unverified as *unconfirmed*.
2. **Don't silently change a decision.** If a task conflicts with an ADR, stop and say so. A changed decision needs a new or amended ADR, approved by the maintainer.
3. **Keep the glossary current.** When a domain term is introduced or sharpened, update `GLOSSARY.md` in the same change. It holds definitions only, never implementation details.
4. **Don't name other SDKs or projects in repository documents.** Refer to them generically ("an implementation", "the oracle implementation").
5. **Secrets never enter the repository or the logs.** That covers the SOL password, real certificates (`.pfx`/`.p12`) and their passphrases. Use only generated test certificates and SUNAT's public beta credentials.
6. **Code, comments and docs are in English.** `README.es.md` is the one Spanish document.
7. **Commit or push only when asked.** Never work directly on `main`.
