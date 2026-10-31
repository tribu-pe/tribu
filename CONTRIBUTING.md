# Contributing to Tribu

[Leer en español](CONTRIBUTING.es.md)

Thank you for helping. Tribu is young, so every report counts, including "it worked".

## Never share secrets

Before you paste anything into an issue or a Pull Request, remove:

- your **SOL password** and SOL user;
- your **Certificate** (`.pfx`/`.p12`) and its **passphrase**;
- real customer data. Replace names, RUCs and DNIs with made-up ones.

A Record or an error from Tribu never contains your password or Certificate, but your own logs might.

## Reporting a bug

[Open a bug report](https://github.com/tribu-pe/tribu/issues/new?template=bug.md) with:

- the Tribu commit you installed and your Node.js version;
- the Environment: `beta` or `production`;
- what you called, with the input (without secrets);
- what happened: `error.kind`, `error.issues`, and SUNAT's code and message (`record.cdr` or the error);
- what you expected.

If SUNAT rejected a Document that Tribu let through, that is a bug in Tribu's rules: tell us the SUNAT code.

## Reporting a production result

Tribu has only been verified in SUNAT's beta environment. If you issued real Documents with it, [open a production report](https://github.com/tribu-pe/tribu/issues/new?template=production-report.md), even if everything worked. See [Trying it in production](docs/guide/production.md) for what we most want to know.

## Asking for a feature

[Open a feature request](https://github.com/tribu-pe/tribu/issues/new?template=feature.md). Say what you need to issue and, if you know it, the SUNAT rule or document behind it.

## Proposing a change

1. For anything bigger than a small fix, open an issue first so we can agree on the approach.
2. Fork the repository and create a branch from `main`.
3. Install and check:

   ```sh
   pnpm install
   pnpm check       # typecheck, lint, layer rules, catalogs, unit tests
   pnpm test:beta   # optional: runs against SUNAT beta with its public credentials
   ```

4. If users will notice the change, record it with `pnpm changeset`.
5. Open a Pull Request to `main` that explains what changed and why.

The rules that matter most:

- **Every SUNAT fact needs a source.** A code, deadline, rate or format comes from `sources/sunat/`, `docs/research/` or an official SUNAT document, and is cited. Mark anything unverified as *unconfirmed*.
- **Use the domain words** in [GLOSSARY.md](GLOSSARY.md).
- **Code, comments and docs are in English.** The Spanish documents are `README.es.md`, `CONTRIBUTING.es.md` and `docs/guide/es/`. Keep them in sync with their English versions.
- **Read the ADR before changing a design** ([docs/adr/](docs/adr)).

The details are in [AGENTS.md](AGENTS.md), [docs/agents/structure.md](docs/agents/structure.md) and [docs/agents/code-style.md](docs/agents/code-style.md).

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
