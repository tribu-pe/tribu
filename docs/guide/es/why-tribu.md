# Por qué Tribu

Emitir una factura electrónica a SUNAT tiene muchos pasos. Algunas librerías te dan piezas para cada uno, y igual tienes que juntarlas tú. Tribu hace todos los pasos y te devuelve un solo resultado.

## Los pasos, lado a lado

| Paso | Sin Tribu | Con Tribu |
|---|---|---|
| Montos | Calculas valor unitario, IGV, totales y redondeo, y los mantienes consistentes dentro de la tolerancia de SUNAT | Das `price` o `value`; Tribu calcula todo lo demás |
| Tasa de IGV | Escribes la tasa y recuerdas cuándo cambia | Sale de tu régimen de IGV y de la fecha de emisión |
| Códigos de SUNAT | Buscas los códigos de catálogo (tipo de comprobante, documento de identidad, afectación, unidad…) y los escribes | Constantes: `Unit.Service`, `Affectation.Exempt`, `Reason.Void` |
| Reglas | Te enteras de qué está mal cuando SUNAT lo rechaza, y puede que el número ya esté usado | Se revisan antes de enviar, con la regla de SUNAT, el motivo y cómo corregirlo |
| XML | Escribes UBL 2.1 a mano o con una plantilla, en el orden exacto que espera SUNAT | Se arma por ti |
| Firma | Configuras XMLDSig con tu certificado | Se firma por ti; el certificado se revisa al iniciar |
| Envío | Armas el ZIP con el nombre que exige SUNAT, el sobre SOAP y WS-Security | Una llamada: `sunat.invoice(...)` |
| Respuesta de SUNAT | Descomprimes el CDR, lees su XML e interpretas el código de respuesta | `record.status`: `accepted`, `rejected`, … con las observaciones listadas |
| Respuestas perdidas | Decides si reenviar y arriesgas un duplicado | Nunca reenvía a ciegas; el Record queda `unconfirmed` y tú decides |
| Resúmenes y bajas | Armas otros formatos de XML, recibes un ticket y lo consultas | `dailySummary()`, `voidDocuments()`, `waitFor()` |
| Qué guardar | Decides qué te obliga a guardar la ley | Un solo `record` en JSON con el XML, el CDR, el texto del QR y el estado |
| Pruebas | Necesitas una cuenta de prueba de SUNAT o tus propios mocks | `fakeSunat()` acepta, rechaza o falla cuando se lo pides |

## La misma factura

**Sin Tribu**, más o menos:

1. Calcular el valor, el IGV y los totales de cada línea, y redondearlos.
2. Llenar una plantilla XML UBL 2.1 con esos montos y los códigos de SUNAT.
3. Firmar el XML con tu certificado (XMLDSig).
4. Comprimirlo como `RUC-01-F001-1.zip`.
5. Meterlo en un sobre SOAP `sendBill` con tu Clave SOL.
6. Enviarlo, descomprimir la respuesta y leer el código del CDR.
7. Decidir qué significa ese código y qué guardar.

**Con Tribu:**

```ts
const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});

await db.save(record);
record.status.code; // 'accepted'
```

## Lo que Tribu todavía no hace

Tribu es joven y solo se probó en el entorno beta de SUNAT. Mira [Qué cubre la v0.1](../../../README.es.md#qué-cubre-la-v01) y [Probar en producción](production.md).

---

[← Guía](README.md)
