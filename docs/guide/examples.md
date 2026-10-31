# Examples

Short recipes for what you can do with Tribu. Each one assumes a client created as in the [Quick start](../../README.md#quick-start), against beta while you develop:

```ts
import { readFileSync } from 'node:fs';
import tribu from 'tribu';

const sunat = tribu.create({
  env: 'beta',
  issuer: { ruc: '20000000001', name: 'EMPRESA DE PRUEBA SAC', ubigeo: '150101' },
  sol: { user: 'MODDATOS', password: 'MODDATOS' },
  certificate: { pfx: readFileSync('certificate.pfx'), passphrase: process.env.PFX_PASSPHRASE ?? '' },
  nextNumber: (series) => db.nextNumber(series), // your database reserves the Number
});
```

`db` stands for your own storage. Save every `record` before doing anything else.

## Invoices

### Cash, prices with IGV included

```ts
const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [
    { description: 'Teclado', quantity: 2, price: 118 },
    { description: 'Mouse', quantity: 1, price: 59 },
  ],
});
await db.save(record);
```

### Credit, in Installments

```ts
import { Unit } from 'tribu';

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

`value` is the price without IGV. The Installments must add up to the total.

### In US dollars

```ts
import { Currency } from 'tribu';

await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  currency: Currency.Usd,
  items: [{ description: 'Licencia anual', quantity: 1, price: 590 }],
});
```

### Exempt and unaffected lines

```ts
import { Affectation } from 'tribu';

await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [
    { description: 'Teclado', quantity: 1, price: 118 },
    { description: 'Libro', quantity: 1, value: 50, affectation: Affectation.Exempt },
    { description: 'Servicio exterior', quantity: 1, value: 80, affectation: Affectation.Unaffected },
  ],
});
```

## Receipts

### Anonymous Customer, up to S/ 700

```ts
await sunat.receipt({ items: [{ description: 'Mouse', quantity: 1, price: 50 }] });
```

### With a DNI

```ts
await sunat.receipt({
  customer: { dni: '12345678', name: 'Juan Pérez' },
  items: [{ description: 'Televisor', quantity: 1, price: 2500 }],
});
```

### Many Receipts in one Daily Summary

```ts
const { record: first } = await sunat.receipt(
  { items: [{ description: 'Café', quantity: 2, price: 8 }] },
  { send: false }, // issued and signed, not sent yet
);
const { record: second } = await sunat.receipt(
  { items: [{ description: 'Sándwich', quantity: 1, price: 12 }] },
  { send: false },
);

const { record: summary } = await sunat.dailySummary({
  date: first.document.issueDate,
  issued: [first, second],
  voided: [],
  number: 1, // the summary's number for that day
  onTicket: (ticket) => db.saveTicket(ticket),
});

const { record, documents } = await sunat.waitFor(summary);
await db.save(record); // keeps the summary's CDR
for (const receipt of documents) console.log(receipt.id, receipt.status.code); // 'accepted'
```

## Notes

### Void an Invoice with a Credit Note

```ts
import { Reason } from 'tribu/catalogs/credit-note';

const invoice = await db.load('F001-1'); // the Record you saved, as plain JSON
await sunat.creditNote({ modifies: invoice, reason: Reason.Void });
```

### Return one Item

```ts
import { Reason } from 'tribu/catalogs/credit-note';

await sunat.creditNote({
  modifies: invoice,
  reason: Reason.Item.Return,
  items: [{ description: 'Teclado', quantity: 1, price: 118 }],
});
```

### Charge late-payment interest with a Debit Note

```ts
import { Reason } from 'tribu/catalogs/debit-note';

await sunat.debitNote({
  modifies: invoice,
  reason: Reason.Interest,
  items: [{ description: 'Intereses por mora', quantity: 1, price: 11.8 }],
});
```

## Voiding

### Void an accepted Invoice (Voided Documents)

```ts
const [voiding] = await sunat.voidDocuments({
  documents: [invoice],
  reason: 'Error en los datos del cliente',
  number: 1,
});
if (voiding) {
  const { documents } = await sunat.waitFor(voiding.record);
  console.log(documents[0]?.status.code); // 'voided'
}
```

Receipts are voided in a Daily Summary instead: pass them in `voided: [...]`.

## Before sending

### See the totals without sending

```ts
const document = sunat.preview({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});
document.totals.payable.toFixed(2); // '236.00'
```

### Check SUNAT's rules without sending

```ts
await sunat.validate({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
}); // throws a TribuError of kind 'validation' if a Rule fails
```

## Errors

### Get the result instead of an exception

```ts
const { record, error } = await sunat.invoice(
  { customer: { ruc: '20123456786', name: 'CLIENTE SAC' }, items: [{ description: 'Teclado', quantity: 1, price: 118 }] },
  { throw: false },
);
await db.save(record);
if (error) console.log(error.kind, error.issues[0]?.fix);
```

### Try again after a lost answer

```ts
import { Status } from 'tribu';

const pending = await db.load('F001-7');
if (pending.status.code === Status.Unconfirmed.code) {
  const { record } = await sunat.retry(pending);
  await db.save(record);
}
```

## Restaurants and hotels

The reduced IGV rate (Ley 31556) comes from the Issuer's IGV Regime, not from each Document:

```ts
import tribu, { Igv } from 'tribu';

const sunat = tribu.create({
  issuer: { ruc: '20000000001', name: 'RESTAURANTE SAC', ubigeo: '150101', igv: Igv.Hospitality },
  // ...
});
```

## Testing your own code

```ts
import tribu from 'tribu';
import { fakeSunat } from 'tribu/testing';

const fake = fakeSunat({ reject: { 'F001-2': '2800' } });
const sunat = tribu.create({ env: 'beta', transport: fake, /* ... */ });

await sunat.invoice({ /* ... */ number: 2 }, { throw: false }); // rejected, like SUNAT would
fake.submissions; // what was sent
```

---

[← Guide](README.md)
