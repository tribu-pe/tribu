# Configuration

## Production is the default

Tribu exists to issue real Documents, so **the Environment is production unless you say otherwise**. It resolves as: `env` in code, then the `SUNAT_ENV` variable, then `production`. `NODE_ENV` is never read.

If your machine holds your company's real SOL Credentials and Certificate, every Document you issue while testing is **legally binding**. Choose beta explicitly while you develop:

```ts
const sunat = tribu.create({ env: 'beta', /* ... */ });
sunat.env; // 'beta': the resolved Environment, always visible
```

Creating a production client with SUNAT's public test user (`MODDATOS`) fails, with an error that tells you how to switch to beta.

## Configuration

| Option | Default | |
|---|---|---|
| `env` | `SUNAT_ENV`, then `'production'` | `'beta'` or `'production'` |
| `issuer` | required | `ruc`, `name`, `ubigeo`, `igv` (`Igv.General`), `detraccionAccount` (your Banco de la Nación account, for [detracciones](documents.md#detracciones)) |
| `sol` | `SUNAT_SOL_USER`, `SUNAT_SOL_PASSWORD` | SOL user without the RUC |
| `certificate` | required | `{ pfx: Buffer, passphrase }` |
| `nextNumber` | none | `(series) => Promise<number>`; otherwise pass `number` on each call |
| `series` | `F001`, `B001`, notes `FC01`/`BC01`, `FD01`/`BD01` | A note's series starts with the letter of the Document it modifies |
| `rounding` | `Rounding.HalfUp` | Or `Rounding.HalfEven` |
| `signature` | `Signature.RsaSha256` | Or `Signature.RsaSha1`. SUNAT beta accepts both |
| `recovery` | `Recovery.Confirm` | One value, or one per document type |
| `timeout` | `30000` ms | |
| `retry` | `{ attempts: 3, delay: 1000 }` | Only for failures before sending |
| `rules` | `{ disable: [] }` | Rule ids to switch off |
| `transport` | SUNAT's web services | `fakeSunat()` in tests |

Options take constants (`Igv.General`, `Rounding.HalfUp`, …), never free text: a value SUNAT doesn't accept would make every Document fail.

## Entry points

| Import | Contents |
|---|---|
| `tribu` | `tribu.create`, plus everything below except per-document catalogs |
| `tribu/values` | `Money`, `Ruc`, `Dni`, `DocumentId` |
| `tribu/results` | `Status`, `TribuError` |
| `tribu/catalogs` | SUNAT catalogs: `DocumentType`, `Currency`, `Unit`, `Identity`, `Affectation`, `Igv`, `ReturnCode`, … |
| `tribu/catalogs/credit-note`, `tribu/catalogs/debit-note` | `Reason` for each note |
| `tribu/testing` | `fakeSunat()` |

---

[← Guide](README.md)
