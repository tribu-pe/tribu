# Records y errores

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

---

[← Guía](README.md)
