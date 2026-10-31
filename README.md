# Tribu

Issue Peruvian electronic payment documents (comprobantes de pago electrónicos) to SUNAT from TypeScript.

```ts
const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});
```

Tribu calculates the amounts, validates the Document against SUNAT's rules before sending it, builds the UBL 2.1 XML, signs it, sends it, and hands back one plain JSON Record for you to save. You never write XML, never compute IGV, and never type a SUNAT code by hand.

[Leer en español](README.es.md)

> [!WARNING]
> **Experimental.** Tribu is published only as an experimental version. SUNAT's beta environment accepts every document type it issues ([Milestone 0 results](docs/research/milestone-0-results.md)), but it has **not been verified in production**. Try it in beta first. If you use it in production, read [Trying it in production](docs/guide/production.md) and please [tell us how it went](https://github.com/tribu-pe/tribu/issues/new?template=production-report.md).

> [!IMPORTANT]
> **v0.1 does not support detracciones.** If your invoices are subject to them, don't use v0.1 for those invoices yet. Perceptions, retentions, advance payments, exports, free operations, ISC and ICBPER are also out of scope (see [What v0.1 covers](#what-v01-covers)).

## Why Tribu

Without Tribu you compute the IGV, write the UBL XML, sign it, zip it, send it over SOAP, and decode SUNAT's answer yourself. With Tribu that is one call, SUNAT's rules are checked before sending, and every error tells you how to fix it. [See the comparison, step by step](docs/guide/why-tribu.md).

## Requirements

- Node.js 22.12 or later. Tribu runs on the server only: it holds your Certificate and SOL password, so `tribu.create` refuses to run in a browser.
- ESM only.

## Installation

```sh
npm install tribu@experimental
# or
pnpm add tribu@experimental
```

The `experimental` versions (`0.1.0-experimental.N`) are tested against SUNAT beta only. A stable version will follow once Tribu is verified in production.

## Quick start

```ts
import { readFileSync } from 'node:fs';
import tribu, { Status } from 'tribu';

const sunat = tribu.create({
  env: 'beta',
  issuer: { ruc: '20000000001', name: 'EMPRESA DE PRUEBA SAC', ubigeo: '150101' },
  sol: { user: 'MODDATOS', password: 'MODDATOS' }, // SUNAT's public beta credentials
  certificate: { pfx: readFileSync('certificate.pfx'), passphrase },
  nextNumber: (series) => db.nextNumber(series), // your database reserves the Number
});

const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});

await db.save(record); // save the Record before doing anything else

record.id;          // 'F001-1'
record.status.code; // 'accepted'
record.qr;          // the QR text for the Printed Representation
```

In production, `sol` and `env` usually come from the environment: `SUNAT_ENV`, `SUNAT_SOL_USER` and `SUNAT_SOL_PASSWORD`. Pass the SOL user **without** the RUC; Tribu adds it.

`tribu.create` opens the Certificate at once, so a wrong passphrase or an expired Certificate fails at startup, not on your first sale. A Certificate that expires within 30 days shows up in `sunat.warnings`.

> [!CAUTION]
> **Production is the default.** Without `env: 'beta'` (or `SUNAT_ENV=beta`), Tribu talks to SUNAT's production service, and every Document is legally binding. See [Configuration](docs/guide/configuration.md).

## Documentation

| | |
|---|---|
| [Examples](docs/guide/examples.md) | Recipes for everything Tribu does |
| [Documents](docs/guide/documents.md) | Amounts and IGV, Invoices, Receipts, notes, voiding |
| [Records and errors](docs/guide/records-and-errors.md) | What to save, statuses, errors, network failures |
| [Testing your code](docs/guide/testing.md) | `fakeSunat()` |
| [Configuration](docs/guide/configuration.md) | Environments, options, entry points |
| [SUNAT deadlines](docs/guide/deadlines.md) | The deadlines Tribu checks |
| [Trying it in production](docs/guide/production.md) | What you need and what is not verified yet |

The whole guide: [docs/guide](docs/guide/README.md). The vocabulary: [GLOSSARY.md](GLOSSARY.md).

## What v0.1 covers

| Area | Included |
|---|---|
| Documents | Invoices, Receipts (individually or in a Daily Summary), Credit and Debit Notes |
| Reporting | Daily Summary, Voided Documents, `waitFor`, `retry` |
| Lines | Taxed, exempt or unaffected; units NIU and ZZ |
| IGV | General and the reduced rate for restaurants and hotels |
| Currency | PEN by default, USD |
| Payment Terms | Cash, or credit with Installments |

**Not yet:** detracciones, perceptions, retentions, advance payments, exports and Invoices without RUC, free operations, ISC, ICBPER, the dispatch guide, PDF and QR images, and official support for OSEs (a custom `transport` works, but OSEs are not tested).

## Contributing

Bug reports, production reports and improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first: it explains how to report a problem without exposing your credentials, and how to propose a change.

## License

[MIT](LICENSE)
