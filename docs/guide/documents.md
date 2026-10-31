# Documents

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

---

[← Guide](README.md)
