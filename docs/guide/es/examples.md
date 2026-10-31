# Ejemplos

Recetas cortas de lo que puedes hacer con Tribu. Cada una supone un cliente creado como en el [Inicio rápido](../../../README.es.md#inicio-rápido), contra beta mientras desarrollas:

```ts
import { readFileSync } from 'node:fs';
import tribu from 'tribu';

const sunat = tribu.create({
  env: 'beta',
  issuer: { ruc: '20000000001', name: 'EMPRESA DE PRUEBA SAC', ubigeo: '150101' },
  sol: { user: 'MODDATOS', password: 'MODDATOS' },
  certificate: { pfx: readFileSync('certificate.pfx'), passphrase: process.env.PFX_PASSPHRASE ?? '' },
  nextNumber: (series) => db.nextNumber(series), // tu base de datos reserva el número
});
```

`db` representa tu propio almacenamiento. Guarda cada `record` antes de hacer cualquier otra cosa.

## Facturas

### Al contado, precios con IGV incluido

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

### Al crédito, en cuotas

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

`value` es el valor unitario, sin IGV. Las cuotas deben sumar el total.

### En dólares

```ts
import { Currency } from 'tribu';

await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  currency: Currency.Usd,
  items: [{ description: 'Licencia anual', quantity: 1, price: 590 }],
});
```

### Líneas exoneradas e inafectas

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

### Sujeta a detracción

```ts
import { Detraccion } from 'tribu';

// tribu.create({ issuer: { ..., detraccionAccount: '00-000-123456' } })
await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Mantenimiento de equipos', quantity: 1, price: 1180 }],
  detraccion: Detraccion.Maintenance,
  payment: { installments: [{ amount: '1038.40', due: '2026-12-31' }] }, // el total menos el 12 %
});
```

## Boletas

### Cliente anónimo, hasta S/ 700

```ts
await sunat.receipt({ items: [{ description: 'Mouse', quantity: 1, price: 50 }] });
```

### Con DNI

```ts
await sunat.receipt({
  customer: { dni: '12345678', name: 'Juan Pérez' },
  items: [{ description: 'Televisor', quantity: 1, price: 2500 }],
});
```

### Muchas boletas en un Resumen Diario

```ts
const { record: first } = await sunat.receipt(
  { items: [{ description: 'Café', quantity: 2, price: 8 }] },
  { send: false }, // emitida y firmada, todavía no enviada
);
const { record: second } = await sunat.receipt(
  { items: [{ description: 'Sándwich', quantity: 1, price: 12 }] },
  { send: false },
);

const { record: summary } = await sunat.dailySummary({
  date: first.document.issueDate,
  issued: [first, second],
  voided: [],
  number: 1, // el número del resumen en ese día
  onTicket: (ticket) => db.saveTicket(ticket),
});

const { record, documents } = await sunat.waitFor(summary);
await db.save(record); // guarda el CDR del resumen
for (const receipt of documents) console.log(receipt.id, receipt.status.code); // 'accepted'
```

## Notas

### Anular una factura con una nota de crédito

```ts
import { Reason } from 'tribu/catalogs/credit-note';

const invoice = await db.load('F001-1'); // el Record que guardaste, como JSON
await sunat.creditNote({ modifies: invoice, reason: Reason.Void });
```

### Devolver un ítem

```ts
import { Reason } from 'tribu/catalogs/credit-note';

await sunat.creditNote({
  modifies: invoice,
  reason: Reason.Item.Return,
  items: [{ description: 'Teclado', quantity: 1, price: 118 }],
});
```

### Cobrar intereses por mora con una nota de débito

```ts
import { Reason } from 'tribu/catalogs/debit-note';

await sunat.debitNote({
  modifies: invoice,
  reason: Reason.Interest,
  items: [{ description: 'Intereses por mora', quantity: 1, price: 11.8 }],
});
```

## Bajas

### Dar de baja una factura aceptada (Comunicación de Baja)

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

Las boletas se dan de baja en un Resumen Diario: pásalas en `voided: [...]`.

## Antes de enviar

### Ver los totales sin enviar

```ts
const document = sunat.preview({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});
document.totals.payable.toFixed(2); // '236.00'
```

### Revisar las reglas de SUNAT sin enviar

```ts
await sunat.validate({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
}); // lanza un TribuError de tipo 'validation' si falla una regla
```

## Errores

### Recibir el resultado en vez de una excepción

```ts
const { record, error } = await sunat.invoice(
  { customer: { ruc: '20123456786', name: 'CLIENTE SAC' }, items: [{ description: 'Teclado', quantity: 1, price: 118 }] },
  { throw: false },
);
await db.save(record);
if (error) console.log(error.kind, error.issues[0]?.fix);
```

### Reintentar cuando se perdió la respuesta

```ts
import { Status } from 'tribu';

const pending = await db.load('F001-7');
if (pending.status.code === Status.Unconfirmed.code) {
  const { record } = await sunat.retry(pending);
  await db.save(record);
}
```

## Restaurantes y hoteles

La tasa reducida de IGV (Ley 31556) viene del régimen de IGV del emisor, no de cada comprobante:

```ts
import tribu, { Igv } from 'tribu';

const sunat = tribu.create({
  issuer: { ruc: '20000000001', name: 'RESTAURANTE SAC', ubigeo: '150101', igv: Igv.Hospitality },
  // ...
});
```

## Probar tu propio código

```ts
import tribu from 'tribu';
import { fakeSunat } from 'tribu/testing';

const fake = fakeSunat({ reject: { 'F001-2': '2800' } });
const sunat = tribu.create({ env: 'beta', transport: fake, /* ... */ });

await sunat.invoice({ /* ... */ number: 2 }, { throw: false }); // rechazada, como lo haría SUNAT
fake.submissions; // lo que se envió
```

---

[← Guía](README.md)
