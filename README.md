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
> **Not released yet.** v0.1 is implemented and SUNAT's beta environment accepts every document type it issues ([Milestone 0 results](docs/research/milestone-0-results.md)), but it has not been used in production. Don't use it for real Documents until a release is published.

> [!IMPORTANT]
> **v0.1 does not support detracciones.** If your invoices are subject to them, don't use v0.1 for those invoices yet. Perceptions, retentions, advance payments, exports, free operations, ISC and ICBPER are also out of scope (see [What v0.1 covers](#what-v01-covers)).

## Production is the default

Tribu exists to issue real Documents, so **the Environment is production unless you say otherwise**. It resolves as: `env` in code, then the `SUNAT_ENV` variable, then `production`. `NODE_ENV` is never read.

If your machine holds your company's real SOL Credentials and Certificate, every Document you issue while testing is **legally binding**. Choose beta explicitly while you develop:

```ts
const sunat = tribu.create({ env: 'beta', /* ... */ });
sunat.env; // 'beta': the resolved Environment, always visible
```

Creating a production client with SUNAT's public test user (`MODDATOS`) fails, with an error that tells you how to switch to beta.

## Requirements

- Node.js 22.12 or later. Tribu runs on the server only: it holds your Certificate and SOL password, so `tribu.create` refuses to run in a browser.
- ESM only.

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

## Amounts

Each Item gives **either** `price` (Unit Price, tax included: what the Customer pays) **or** `value` (Unit Value, tax excluded). Tribu derives the rest: Item Value, IGV and the totals.

```ts
sunat.preview({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
}).totals; // value 200.00, igv 36.00, payable 236.00
```

The IGV rate comes from your **IGV Regime**, never from a number you type: `Igv.General` (default) or `Igv.Hospitality`, the reduced rate for small restaurants and hotels (Ley 31556). The rate follows the Document's issue date.

```ts
import tribu, { Igv } from 'tribu';

tribu.create({ issuer: { /* ... */ igv: Igv.Hospitality }, /* ... */ });
```

Lines are taxed by default. Pass `affectation: Affectation.Exempt` or `Affectation.Unaffected` on an Item to change it, and `unit: Unit.Service` for services (the default unit is goods, `NIU`).

## Documents

### Invoices

```ts
await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Consultoría', quantity: 1, value: 1000, unit: Unit.Service }],
  payment: {
    installments: [
      { amount: 590, due: '2026-12-15' },
      { amount: 590, due: '2027-01-15' },
    ],
  },
});
```

Without `payment`, the Payment Terms are cash. With `installments`, they are credit, and the Installments must add up to the amount pending payment.

### Receipts

A Receipt is sent at once and comes back with its CDR, just like an Invoice. The Customer is optional while the total doesn't exceed S/ 700.00.

```ts
await sunat.receipt({ items: [{ description: 'Mouse', quantity: 1, price: 50 }] });
```

For high volume, or for Receipts older than 5 days, hold them with `{ send: false }` and report them in a Daily Summary:

```ts
const { record: receipt } = await sunat.receipt(
  { items: [{ description: 'Mouse', quantity: 1, price: 50 }] },
  { send: false },
); // status 'issued'

const { record: summary } = await sunat.dailySummary({
  date: '2026-10-30',  // the issue date of the Receipts
  issued: [receipt],   // Receipts to report
  voided: [],          // Receipts to void
  number: 1,           // the summary's number for the day
  onTicket: (ticket) => db.saveTicket(ticket),
});

const { documents } = await sunat.waitFor(summary); // each Receipt with its final status
```

### Credit and Debit Notes

A note takes the Record of the Document it modifies, and a Reason from its own catalog:

```ts
import { Reason } from 'tribu/catalogs/credit-note';

await sunat.creditNote({ modifies: invoiceRecord, reason: Reason.Void });
await sunat.creditNote({
  modifies: invoiceRecord,
  reason: Reason.Item.Return,
  items: [{ description: 'Teclado', quantity: 1, price: 118 }],
});
```

Passing the Record (as you saved it, even after `JSON.parse`) lets Tribu copy the Customer, currency and Items, and check the note against the Affected Document before sending. Debit Notes work the same way, with `Reason` from `tribu/catalogs/debit-note`.

### Voided Documents

```ts
const [voiding] = await sunat.voidDocuments({
  documents: [invoiceRecord],
  reason: 'Error en los datos del cliente',
  number: 1,
});
const { documents } = await sunat.waitFor(voiding.record); // each Invoice now 'voided'
```

Receipts are voided in a Daily Summary (`voided: [...]`), not here.

## Records

Tribu stores nothing. Every operation returns a `record`: plain, serializable JSON with the Document data, the signed XML, the CDR, the QR text, the Ticket and the current status. You are legally required to keep the XML and the CDR, and Tribu needs the Record back for notes, summaries and retries.

**Save the Record before doing anything else.**

Compare statuses by code, which survives JSON:

```ts
if (record.status.code === Status.Accepted.code) { /* ... */ }
```

| Status | Meaning |
|---|---|
| `issued` | Built and signed, not yet reported to SUNAT |
| `processing` | SUNAT holds it under a Ticket and is still working |
| `accepted` | SUNAT approved it, with or without Observations (`record.cdr.observations`) |
| `rejected` | SUNAT refused it for its content. For an Invoice, the Number stays used |
| `unconfirmed` | Sent, but the answer was lost: SUNAT may or may not have it |
| `voided` | Accepted earlier, cancelled since |

## Errors

There is one error class, `TribuError`. Its `kind` says what happened, and each entry in `issues` says where, why, how to fix it and which SUNAT rule or ADR it comes from:

```ts
try {
  await sunat.invoice({ customer: { dni: '12345678', name: 'Juan Pérez' }, items });
} catch (error) {
  if (error instanceof TribuError) {
    error.kind;   // 'validation'
    error.issues; // [{ code: '2800', path: 'customer', why: '...', fix: '...', source: '...' }]
    error.record; // the Record, whenever one exists
  }
}
```

| `kind` | When |
|---|---|
| `config` | `tribu.create` options are wrong |
| `validation` | The Document breaks a Rule. Nothing was sent and no Number was used |
| `rejected` | SUNAT evaluated the Document and refused it |
| `unconfirmed` | The answer was lost after sending |
| `exception` | SUNAT could not process the request (for example, wrong SOL Credentials) |

Validation blocks what SUNAT would reject and only warns about what SUNAT merely observes (`result.warnings`). Per call, `{ throw: false }` returns `{ record, error }` instead of throwing, `{ validate: 'warn' }` sends anyway, and `rules: { disable: ['invoice/customer-has-ruc'] }` in `tribu.create` switches off one Rule by its id.

Error messages and `JSON.stringify(error)` never contain your SOL password, passphrase or Certificate.

## When the network fails

- **Before sending**, Tribu retries on its own (`retry: { attempts: 3, delay: 1000 }` by default, with exponential backoff).
- **After sending**, it never re-sends blindly: a second copy could register the Document twice. By default (`Recovery.Confirm`) the Record ends `unconfirmed` and you decide. In production, Invoices and notes are first looked up in SUNAT. Call `sunat.retry(record)` later, or choose `Recovery.Resend` per document type:

```ts
tribu.create({ recovery: { receipt: Recovery.Resend }, /* ... */ });
```

## Testing your code

`tribu/testing` provides `fakeSunat()`, an in-memory SUNAT that you pass as the transport. It can accept, reject, observe, fail before or after sending, and answer Tickets:

```ts
import tribu from 'tribu';
import { fakeSunat } from 'tribu/testing';

const fake = fakeSunat({ reject: { 'F001-2': '2800' }, tickets: ['0'] });
const sunat = tribu.create({ env: 'beta', transport: fake, /* ... */ });

fake.submissions; // what was sent
```

## Configuration

| Option | Default | |
|---|---|---|
| `env` | `SUNAT_ENV`, then `'production'` | `'beta'` or `'production'` |
| `issuer` | required | `ruc`, `name`, `ubigeo`, `igv` (`Igv.General`) |
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

## SUNAT deadlines Tribu checks

| What | Deadline | Source |
|---|---|---|
| Invoice and its notes | Up to 3 calendar days after the issue date | R.S. 097-2012 art. 12.1 c) (ERR 2108) |
| Receipt sent individually | Up to 5 calendar days after the issue date; later, only in a Daily Summary | R.S. 097-2012 art. 7.3 (ERR 1079) |
| Daily Summary | By the 7th calendar day after the issue date (an observation, not a rejection) | R.S. 097-2012 art. 21.1 b) (OBS 4443) |
| Voided Documents | 7 calendar days, counted from the issue date by SUNAT's validator | R.S. 097-2012 art. 14.1 b) (ERR 2957) |

Each Rule cites its SUNAT source in the code. The full list, with sources, is in [docs/research/sunat-facts-2026-10.md](docs/research/sunat-facts-2026-10.md).

## Learn more

- [GLOSSARY.md](GLOSSARY.md): the vocabulary, with SUNAT's Spanish term for each concept.
- [docs/adr/](docs/adr): why Tribu works the way it does.
- [AGENTS.md](AGENTS.md): how the repository is organized and the commands to work on it.

## License

[MIT](LICENSE)
