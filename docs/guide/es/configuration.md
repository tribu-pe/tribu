# Configuración

## Producción es el entorno por defecto

Tribu existe para emitir comprobantes reales, así que **el entorno es producción salvo que digas lo contrario**. Se resuelve así: `env` en el código, luego la variable `SUNAT_ENV`, luego `production`. `NODE_ENV` nunca se lee.

Si tu máquina tiene la Clave SOL y el certificado reales de tu empresa, todo comprobante que emitas mientras pruebas **tiene validez legal**. Elige beta de forma explícita mientras desarrollas:

```ts
const sunat = tribu.create({ env: 'beta', /* ... */ });
sunat.env; // 'beta': el entorno resuelto, siempre visible
```

Crear un cliente de producción con el usuario público de pruebas de SUNAT (`MODDATOS`) falla, con un error que explica cómo pasar a beta.

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

---

[← Guía](README.md)
