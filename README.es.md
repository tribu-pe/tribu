# Tribu

Emite comprobantes de pago electrónicos a SUNAT desde TypeScript.

```ts
const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});
```

Tribu calcula los montos, valida el comprobante contra las reglas de SUNAT antes de enviarlo, arma el XML UBL 2.1, lo firma, lo envía y te devuelve un `record`: JSON simple que tú guardas. No escribes XML, no calculas el IGV y no tecleas ningún código de SUNAT a mano.

[Read in English](README.md)

> [!WARNING]
> **Todavía no está publicado.** La v0.1 está implementada y el entorno beta de SUNAT acepta todos los tipos de comprobante que emite ([resultados del Milestone 0](docs/research/milestone-0-results.md), en inglés), pero no se ha usado en producción. No la uses para comprobantes reales hasta que haya una versión publicada.

> [!IMPORTANT]
> **La v0.1 no soporta detracciones.** Si tus facturas están sujetas a detracción, todavía no uses la v0.1 para esas facturas. Tampoco cubre percepciones, retenciones, anticipos, exportaciones, operaciones gratuitas, ISC ni ICBPER (ver [Qué cubre la v0.1](#qué-cubre-la-v01)).

## Producción es el entorno por defecto

Tribu existe para emitir comprobantes reales, así que **el entorno es producción salvo que digas lo contrario**. Se resuelve así: `env` en el código, luego la variable `SUNAT_ENV`, luego `production`. `NODE_ENV` nunca se lee.

Si tu máquina tiene la Clave SOL y el certificado reales de tu empresa, todo comprobante que emitas mientras pruebas **tiene validez legal**. Elige beta de forma explícita mientras desarrollas:

```ts
const sunat = tribu.create({ env: 'beta', /* ... */ });
sunat.env; // 'beta': el entorno resuelto, siempre visible
```

Crear un cliente de producción con el usuario público de pruebas de SUNAT (`MODDATOS`) falla, con un error que explica cómo pasar a beta.

## Requisitos

- Node.js 22.12 o superior. Tribu corre solo en el servidor: maneja tu certificado y tu Clave SOL, así que `tribu.create` se niega a correr en un navegador.
- Solo ESM.

## Inicio rápido

```ts
import { readFileSync } from 'node:fs';
import tribu, { Status } from 'tribu';

const sunat = tribu.create({
  env: 'beta',
  issuer: { ruc: '20000000001', name: 'EMPRESA DE PRUEBA SAC', ubigeo: '150101' },
  sol: { user: 'MODDATOS', password: 'MODDATOS' }, // credenciales públicas de beta de SUNAT
  certificate: { pfx: readFileSync('certificate.pfx'), passphrase },
  nextNumber: (series) => db.nextNumber(series), // tu base de datos reserva el correlativo
});

const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});

await db.save(record); // guarda el record antes que cualquier otra cosa

record.id;          // 'F001-1'
record.status.code; // 'accepted'
record.qr;          // el texto del QR para la representación impresa
```

En producción, `sol` y `env` suelen venir del entorno: `SUNAT_ENV`, `SUNAT_SOL_USER` y `SUNAT_SOL_PASSWORD`. El usuario SOL va **sin** el RUC; Tribu lo agrega.

`tribu.create` abre el certificado de inmediato: una contraseña equivocada o un certificado vencido fallan al arrancar, no en tu primera venta. Un certificado que vence en 30 días o menos aparece en `sunat.warnings`.

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

## Records

Tribu no guarda nada. Cada operación devuelve un `record`: JSON simple y serializable con los datos del comprobante, el XML firmado, el CDR, el texto del QR, el ticket y el estado actual. La ley te obliga a conservar el XML y el CDR, y Tribu necesita el `record` de vuelta para notas, resúmenes y reintentos.

**Guarda el `record` antes que cualquier otra cosa.**

Compara estados por su código, que sobrevive a JSON:

```ts
if (record.status.code === Status.Accepted.code) { /* ... */ }
```

| Estado | Significado |
|---|---|
| `issued` | Armado y firmado, todavía no informado a SUNAT |
| `processing` | SUNAT lo tiene bajo un ticket y sigue procesándolo |
| `accepted` | SUNAT lo aceptó, con o sin observaciones (`record.cdr.observations`) |
| `rejected` | SUNAT lo rechazó por su contenido. En una factura, el correlativo queda usado |
| `unconfirmed` | Se envió, pero la respuesta se perdió: SUNAT puede tenerlo o no |
| `voided` | Fue aceptado y después se dio de baja |

## Errores

Hay una sola clase de error, `TribuError`. Su `kind` dice qué pasó, y cada elemento de `issues` dice dónde, por qué, cómo arreglarlo y de qué regla de SUNAT o ADR viene:

```ts
try {
  await sunat.invoice({ customer: { dni: '12345678', name: 'Juan Pérez' }, items });
} catch (error) {
  if (error instanceof TribuError) {
    error.kind;   // 'validation'
    error.issues; // [{ code: '2800', path: 'customer', why: '...', fix: '...', source: '...' }]
    error.record; // el record, siempre que exista
  }
}
```

| `kind` | Cuándo |
|---|---|
| `config` | Las opciones de `tribu.create` están mal |
| `validation` | El comprobante incumple una regla. No se envió nada ni se gastó correlativo |
| `rejected` | SUNAT evaluó el comprobante y lo rechazó |
| `unconfirmed` | La respuesta se perdió después del envío |
| `exception` | SUNAT no pudo procesar la solicitud (por ejemplo, Clave SOL incorrecta) |

La validación bloquea lo que SUNAT rechazaría y solo advierte de lo que SUNAT apenas observa (`result.warnings`). En cada llamada, `{ throw: false }` devuelve `{ record, error }` en vez de lanzar, `{ validate: 'warn' }` envía de todos modos, y `rules: { disable: ['invoice/customer-has-ruc'] }` en `tribu.create` desactiva una regla por su id.

Los mensajes de error y `JSON.stringify(error)` nunca contienen tu Clave SOL, la contraseña del certificado ni el certificado.

## Cuando falla la red

- **Antes del envío**, Tribu reintenta solo (`retry: { attempts: 3, delay: 1000 }` por defecto, con espera exponencial).
- **Después del envío**, nunca reenvía a ciegas: una segunda copia podría registrar el comprobante dos veces. Por defecto (`Recovery.Confirm`) el `record` queda `unconfirmed` y tú decides. En producción, las facturas y notas se consultan primero en SUNAT. Llama a `sunat.retry(record)` más tarde, o elige `Recovery.Resend` por tipo de comprobante:

```ts
tribu.create({ recovery: { receipt: Recovery.Resend }, /* ... */ });
```

## Probar tu código

`tribu/testing` trae `fakeSunat()`, una SUNAT en memoria que pasas como transporte. Puede aceptar, rechazar, observar, fallar antes o después del envío y responder tickets:

```ts
import tribu from 'tribu';
import { fakeSunat } from 'tribu/testing';

const fake = fakeSunat({ reject: { 'F001-2': '2800' }, tickets: ['0'] });
const sunat = tribu.create({ env: 'beta', transport: fake, /* ... */ });

fake.submissions; // lo que se envió
```

## Configuración

| Opción | Por defecto | |
|---|---|---|
| `env` | `SUNAT_ENV`, luego `'production'` | `'beta'` o `'production'` |
| `issuer` | obligatorio | `ruc`, `name`, `ubigeo`, `igv` (`Igv.General`) |
| `sol` | `SUNAT_SOL_USER`, `SUNAT_SOL_PASSWORD` | Usuario SOL sin el RUC |
| `certificate` | obligatorio | `{ pfx: Buffer, passphrase }` |
| `nextNumber` | ninguno | `(series) => Promise<number>`; si no, pasa `number` en cada llamada |
| `series` | `F001`, `B001`, notas `FC01`/`BC01`, `FD01`/`BD01` | La serie de una nota empieza con la letra del comprobante que modifica |
| `rounding` | `Rounding.HalfUp` | O `Rounding.HalfEven` |
| `signature` | `Signature.RsaSha256` | O `Signature.RsaSha1`. SUNAT beta acepta ambos |
| `recovery` | `Recovery.Confirm` | Un valor, o uno por tipo de comprobante |
| `timeout` | `30000` ms | |
| `retry` | `{ attempts: 3, delay: 1000 }` | Solo para fallos antes del envío |
| `rules` | `{ disable: [] }` | Ids de reglas a desactivar |
| `transport` | los servicios web de SUNAT | `fakeSunat()` en pruebas |

Las opciones reciben constantes (`Igv.General`, `Rounding.HalfUp`, …), nunca texto libre: un valor que SUNAT no acepte haría fallar todos los comprobantes.

## Puntos de entrada

| Import | Contenido |
|---|---|
| `tribu` | `tribu.create`, más todo lo de abajo salvo los catálogos de cada comprobante |
| `tribu/values` | `Money`, `Ruc`, `Dni`, `DocumentId` |
| `tribu/results` | `Status`, `TribuError` |
| `tribu/catalogs` | Catálogos de SUNAT: `DocumentType`, `Currency`, `Unit`, `Identity`, `Affectation`, `Igv`, `ReturnCode`, … |
| `tribu/catalogs/credit-note`, `tribu/catalogs/debit-note` | `Reason` de cada nota |
| `tribu/testing` | `fakeSunat()` |

## Qué cubre la v0.1

| Área | Incluye |
|---|---|
| Comprobantes | Facturas, boletas (individuales o en resumen diario), notas de crédito y débito |
| Envíos | Resumen diario, comunicación de baja, `waitFor`, `retry` |
| Líneas | Gravadas, exoneradas o inafectas; unidades NIU y ZZ |
| IGV | General y la tasa reducida para restaurantes y hoteles |
| Moneda | PEN por defecto, USD |
| Forma de pago | Contado, o crédito con cuotas |

**Todavía no:** detracciones, percepciones, retenciones, anticipos, exportaciones y facturas sin RUC, operaciones gratuitas, ISC, ICBPER, guía de remisión, PDF e imagen del QR, y soporte oficial para OSE (un `transport` propio funciona, pero los OSE no están probados).

## Plazos de SUNAT que Tribu verifica

| Qué | Plazo | Fuente |
|---|---|---|
| Factura y sus notas | Hasta 3 días calendario después de la fecha de emisión | R.S. 097-2012 art. 12.1 c) (ERR 2108) |
| Boleta enviada individualmente | Hasta 5 días calendario después de la emisión; después, solo por resumen diario | R.S. 097-2012 art. 7.3 (ERR 1079) |
| Resumen diario | Hasta el 7.º día calendario después de la emisión (observación, no rechazo) | R.S. 097-2012 art. 21.1 b) (OBS 4443) |
| Comunicación de baja | 7 días calendario, contados desde la emisión por el validador de SUNAT | R.S. 097-2012 art. 14.1 b) (ERR 2957) |

Cada regla cita su fuente de SUNAT en el código. La lista completa, con fuentes, está en [docs/research/sunat-facts-2026-10.md](docs/research/sunat-facts-2026-10.md) (en inglés).

## Para saber más

- [GLOSSARY.md](GLOSSARY.md): el vocabulario, con el término de SUNAT en español para cada concepto.
- [docs/adr/](docs/adr): por qué Tribu funciona como funciona.
- [AGENTS.md](AGENTS.md): cómo está organizado el repositorio y los comandos para trabajar en él.

Toda la documentación salvo este archivo está en inglés.

## Licencia

[MIT](LICENSE)
