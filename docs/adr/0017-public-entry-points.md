# Five public entry points, grouped by when you use them

Import paths are a public contract that is expensive to change after release. An earlier draft had one subpath per domain area (`identity`, `amounts`, `documents`, `reporting`, `errors`), but most held a single export. Tribu exposes these instead:

| Entry point | Contents | Used when |
|---|---|---|
| `tribu` | The client (`tribu.create`) and re-exports of everything except per-document catalogs | Always |
| `tribu/values` | `Money`, `Ruc`, `Dni`, `DocumentId` | Building input |
| `tribu/results` | `Status`, `TribuError`, `TribuRecord` | Handling what came back |
| `tribu/catalogs` (and `tribu/catalogs/<document>`) | SUNAT catalogs; `Reason` lives only under its document | Using SUNAT codes |
| `tribu/testing` | `fakeSunat()` | Testing an integration without SUNAT beta |

## Consequences

- `tribu` re-exports from the subpaths rather than duplicating code, so `instanceof` works whichever path a class was imported from.
- The package declares `"sideEffects": false`, and each entry point ships its own type definitions.
- `Reason` is not re-exported from `tribu`, because catalogs 09 and 10 both define one (ADR 0013).
