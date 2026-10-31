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
> **Experimental.** Tribu solo está publicado como versión experimental. El entorno beta de SUNAT acepta todos los tipos de comprobante que emite ([resultados del Milestone 0](docs/research/milestone-0-results.md), en inglés), pero **no se ha verificado en producción**. Pruébalo primero en beta. Si lo usas en producción, lee [Probar en producción](docs/guide/es/production.md) y [cuéntanos cómo te fue](https://github.com/tribu-pe/tribu/issues/new?template=production-report.md).

> [!IMPORTANT]
> **Las detracciones solo funcionan en facturas en soles**, para los bienes y servicios con una sola tasa confirmada ([Detracciones](docs/guide/es/documents.md#detracciones)). No cubre percepciones, retenciones, anticipos, exportaciones, operaciones gratuitas, ISC ni ICBPER (ver [Qué cubre la v0.1](#qué-cubre-la-v01)).

## Por qué Tribu

Sin Tribu, tú calculas el IGV, escribes el XML UBL, lo firmas, lo comprimes, lo envías por SOAP y descifras la respuesta de SUNAT. Con Tribu es una sola llamada, las reglas de SUNAT se revisan antes de enviar y cada error te dice cómo corregirlo. [Mira la comparación paso a paso](docs/guide/es/why-tribu.md).

## Requisitos

- Node.js 22.12 o superior. Tribu corre solo en el servidor: maneja tu certificado y tu Clave SOL, así que `tribu.create` se niega a correr en un navegador.
- Solo ESM.

## Instalación

```sh
npm install tribu@experimental
# o
pnpm add tribu@experimental
```

Las versiones `experimental` (`0.1.0-experimental.N`) solo están probadas contra SUNAT beta. Habrá una versión estable cuando Tribu esté verificado en producción.

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

> [!CAUTION]
> **Producción es el entorno por defecto.** Sin `env: 'beta'` (o `SUNAT_ENV=beta`), Tribu habla con el servicio de producción de SUNAT y todo comprobante tiene validez legal. Mira [Configuración](docs/guide/es/configuration.md).

## Documentación

| | |
|---|---|
| [Ejemplos](docs/guide/es/examples.md) | Recetas para todo lo que hace Tribu |
| [Comprobantes](docs/guide/es/documents.md) | Montos e IGV, facturas, boletas, notas, bajas |
| [Records y errores](docs/guide/es/records-and-errors.md) | Qué guardar, estados, errores, fallas de red |
| [Probar tu código](docs/guide/es/testing.md) | `fakeSunat()` |
| [Configuración](docs/guide/es/configuration.md) | Entornos, opciones, puntos de entrada |
| [Plazos de SUNAT](docs/guide/es/deadlines.md) | Los plazos que Tribu verifica |
| [Probar en producción](docs/guide/es/production.md) | Qué necesitas y qué no se ha verificado todavía |
| [@tribu-pe/pdf](https://github.com/tribu-pe/pdf) | El PDF para tu cliente (representación impresa): A4 y ticket, en un paquete aparte |

Toda la guía: [docs/guide/es](docs/guide/es/README.md). El vocabulario: [GLOSSARY.md](GLOSSARY.md) (en inglés).

## Qué cubre la v0.1

| Área | Incluye |
|---|---|
| Comprobantes | Facturas, boletas (individuales o en resumen diario), notas de crédito y débito |
| Envíos | Resumen diario, comunicación de baja, `waitFor`, `retry` |
| Líneas | Gravadas, exoneradas o inafectas; unidades NIU y ZZ |
| IGV | General y la tasa reducida para restaurantes y hoteles |
| Moneda | PEN por defecto, USD |
| Forma de pago | Contado, o crédito con cuotas |
| Detracciones | En facturas en soles; se calculan el monto y el neto pendiente de pago |

**Todavía no:** detracciones en boletas o en dólares, percepciones, retenciones, anticipos, exportaciones y facturas sin RUC, operaciones gratuitas, ISC, ICBPER, guía de remisión, y soporte oficial para OSE (un `transport` propio funciona, pero los OSE no están probados).

## Contribuir

Los reportes de errores, los reportes de producción y las mejoras son bienvenidos. Lee primero [CONTRIBUTING.es.md](CONTRIBUTING.es.md): explica cómo reportar un problema sin exponer tus credenciales y cómo proponer un cambio.

## Licencia

[MIT](LICENSE)
