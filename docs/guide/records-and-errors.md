# Records and errors

## Records

Tribu stores nothing. Every operation returns a `record`: plain, serializable JSON with the Document data, the signed XML, the CDR, the QR text, the Ticket and the current status. You are legally required to keep the XML and the CDR, and Tribu needs the Record back for notes, summaries and retries.

**Save the Record before doing anything else.**

To hand the Customer a PDF with SUNAT's QR (the Printed Representation), pass the Record to [`@tribu-pe/pdf`](https://github.com/tribu-pe/pdf): `await pdf(record)`.

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

---

[← Guide](README.md)
