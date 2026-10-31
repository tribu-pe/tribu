# Comprobantes

## Montos

Cada ítem lleva **o** `price` (precio unitario, con IGV: lo que paga el cliente) **o** `value` (valor unitario, sin IGV). Tribu calcula el resto: valor de venta por ítem, IGV y totales.

```ts
sunat.preview({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
}).totals; // value 200.00, igv 36.00, payable 236.00
```

La tasa de IGV sale de tu **régimen de IGV**, nunca de un número que escribas: `Igv.General` (por defecto) o `Igv.Hospitality`, la tasa reducida para restaurantes y hoteles MYPE (Ley 31556). La tasa sigue la fecha de emisión del comprobante.

```ts
import tribu, { Igv } from 'tribu';

tribu.create({ issuer: { /* ... */ igv: Igv.Hospitality }, /* ... */ });
```

Las líneas son gravadas por defecto. Pasa `affectation: Affectation.Exempt` o `Affectation.Unaffected` en un ítem para cambiarlo, y `unit: Unit.Service` para servicios (la unidad por defecto es bienes, `NIU`).

## Comprobantes

### Facturas

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

Sin `payment`, la forma de pago es contado. Con `installments` es crédito, y las cuotas deben sumar el monto neto pendiente de pago.

### Boletas

Una boleta se envía de inmediato y vuelve con su CDR, igual que una factura. El cliente es opcional mientras el total no pase de S/ 700.00.

```ts
await sunat.receipt({ items: [{ description: 'Mouse', quantity: 1, price: 50 }] });
```

Para mucho volumen, o para boletas de más de 5 días, retenlas con `{ send: false }` e infórmalas en un resumen diario:

```ts
const { record: receipt } = await sunat.receipt(
  { items: [{ description: 'Mouse', quantity: 1, price: 50 }] },
  { send: false },
); // estado 'issued'

const { record: summary } = await sunat.dailySummary({
  date: '2026-10-30',  // la fecha de emisión de las boletas
  issued: [receipt],   // boletas a informar
  voided: [],          // boletas a anular
  number: 1,           // el número del resumen en el día
  onTicket: (ticket) => db.saveTicket(ticket),
});

const { documents } = await sunat.waitFor(summary); // cada boleta con su estado final
```

### Notas de crédito y débito

Una nota recibe el `record` del comprobante que modifica y un motivo de su propio catálogo:

```ts
import { Reason } from 'tribu/catalogs/credit-note';

await sunat.creditNote({ modifies: invoiceRecord, reason: Reason.Void });
await sunat.creditNote({
  modifies: invoiceRecord,
  reason: Reason.Item.Return,
  items: [{ description: 'Teclado', quantity: 1, price: 118 }],
});
```

Al pasar el `record` (tal como lo guardaste, aunque venga de `JSON.parse`), Tribu copia el cliente, la moneda y los ítems, y valida la nota contra el comprobante modificado antes de enviarla. Las notas de débito funcionan igual, con `Reason` de `tribu/catalogs/debit-note`.

### Comunicación de baja

```ts
const [voiding] = await sunat.voidDocuments({
  documents: [invoiceRecord],
  reason: 'Error en los datos del cliente',
  number: 1,
});
const { documents } = await sunat.waitFor(voiding.record); // cada factura queda 'voided'
```

Las boletas se anulan en el resumen diario (`voided: [...]`), no aquí.

---

[← Guía](README.md)
