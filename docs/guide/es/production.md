# Probar en producción

> [!WARNING]
> Tribu solo se ha probado contra el entorno **beta** de SUNAT. Todo comprobante que emitas en producción **tiene validez legal**. Pruébalo ahí solo si aceptas ese riesgo, y empieza con poco.

Si lo haces, cuéntanos cómo te fue, aunque todo haya funcionado: [abre un reporte de producción](https://github.com/tribu-pe/tribu/issues/new?template=production-report.md). Así es como Tribu se verifica.

## Qué necesitas

Según la documentación de SUNAT, resumida en [sunat-facts-2026-10.md](../../research/sunat-facts-2026-10.md) (en inglés):

- **Un RUC y un usuario SOL.** El manual de servicios web de SUNAT pide un usuario SOL *secundario* con el perfil de envío de documentos electrónicos. *No confirmado* para el servicio de envío (está documentado para el servicio de consulta).
- **Un certificado digital** de un proveedor inscrito en el registro de INDECOPI (IOFE), **registrado en SUNAT a través de SOL**. Si no, SUNAT responde ERROR 2325 (2326 si fue dado de baja). SUNAT ofrece un *Certificado Digital Tributario* gratuito a los contribuyentes que califican, hasta el 2027-12-31 (R.S. 038-2020).
- **Emitir directamente a SUNAT.** Si tu RUC emite a través de un OSE, SUNAT rechaza los envíos directos con ERROR 1078.

## Pasos

1. **Haz que funcione primero en beta** con tu propio código, como en el [Inicio rápido](../../../README.es.md#inicio-rápido).
2. **Cambia a producción.** Quita `env: 'beta'` (producción es el entorno por defecto) o usa `SUNAT_ENV=production`. Pasa tu usuario SOL (sin el RUC) y tu clave en `SUNAT_SOL_USER` y `SUNAT_SOL_PASSWORD`, y tu `.pfx` con su contraseña.
3. **Emite un solo comprobante de poco valor** a un cliente de confianza, o a ti mismo.
4. **Revisa el resultado:** `record.status.code` es `'accepted'` y `record.cdr` tiene la respuesta de SUNAT. También puedes buscar el comprobante en el portal SOL de SUNAT.
5. **Guarda cada Record**, aceptado o no. Estás obligado a conservar el XML y el CDR.

Nunca pongas tu Clave SOL, tu `.pfx` ni su contraseña en tu código, tu repositorio o tus logs.

## Lo que todavía no se ha verificado en producción

Beta no pudo responder estas preguntas ([resultados del Milestone 0](../../research/milestone-0-results.md), en inglés). Si ves que pasa alguna, tu reporte vale especialmente.

- **La dirección de producción.** Tribu envía a `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService`. El repositorio todavía no cita una fuente oficial para ella.
- **Rechazos que llegan como SOAP fault.** ¿SUNAT da el número por usado? Tribu supone que sí.
- **Enviar dos veces el mismo comprobante.** Beta lo vuelve a aceptar. *No está confirmado* si producción responde con un código de duplicado como 1033.
- **Recuperar la respuesta perdida de una boleta.** Tribu se detiene y te deja decidir.
- **Límites de peticiones.** Beta rechaza peticiones enviadas una tras otra. En producción no se sabe.

---

[← Guía](README.md)
