# Contribuir a Tribu

[Read in English](CONTRIBUTING.md)

Gracias por ayudar. Tribu es joven, así que cada reporte cuenta, incluso un "funcionó".

## Nunca compartas secretos

Antes de pegar algo en un issue o en un Pull Request, quita:

- tu **Clave SOL** y tu usuario SOL;
- tu **certificado** (`.pfx`/`.p12`) y su **contraseña**;
- los datos reales de tus clientes. Cambia nombres, RUC y DNI por otros inventados.

Un Record o un error de Tribu nunca contiene tu clave ni tu certificado, pero tus propios logs sí podrían.

## Reportar un error

[Abre un reporte de error](https://github.com/tribu-pe/tribu/issues/new?template=bug.md) con:

- el commit de Tribu que instalaste y tu versión de Node.js;
- el entorno: `beta` o `production`;
- qué llamaste, con los datos de entrada (sin secretos);
- qué pasó: `error.kind`, `error.issues`, y el código y mensaje de SUNAT (`record.cdr` o el error);
- qué esperabas.

Si SUNAT rechazó un comprobante que Tribu dejó pasar, es un error en las reglas de Tribu: dinos el código de SUNAT.

## Reportar un resultado en producción

Tribu solo se ha verificado en el entorno beta de SUNAT. Si emitiste comprobantes reales con él, [abre un reporte de producción](https://github.com/tribu-pe/tribu/issues/new?template=production-report.md), aunque todo haya funcionado. Mira en [Probar en producción](docs/guide/es/production.md) lo que más nos interesa saber.

## Pedir una funcionalidad

[Abre una solicitud](https://github.com/tribu-pe/tribu/issues/new?template=feature.md). Di qué necesitas emitir y, si lo sabes, la regla o el comprobante de SUNAT detrás.

## Proponer un cambio

1. Para algo más grande que un arreglo pequeño, abre primero un issue para acordar el enfoque.
2. Haz un fork del repositorio y crea una rama desde `main`.
3. Instala y revisa:

   ```sh
   pnpm install
   pnpm check       # tipos, lint, reglas de capas, catálogos, tests unitarios
   pnpm test:beta   # opcional: corre contra SUNAT beta con sus credenciales públicas
   ```

4. Si los usuarios notarán el cambio, regístralo con `pnpm changeset`.
5. Abre un Pull Request a `main` que explique qué cambió y por qué.

Las reglas más importantes:

- **Todo dato de SUNAT necesita una fuente.** Un código, plazo, tasa o formato sale de `sources/sunat/`, `docs/research/` o un documento oficial de SUNAT, y se cita. Marca como *unconfirmed* lo que no esté verificado.
- **Usa las palabras del dominio** de [GLOSSARY.md](GLOSSARY.md).
- **El código, los comentarios y la documentación van en inglés.** Los documentos en español son `README.es.md`, `CONTRIBUTING.es.md` y `docs/guide/es/`. Mantenlos al día con sus versiones en inglés.
- **Lee el ADR antes de cambiar un diseño** ([docs/adr/](docs/adr)).

Los detalles están en [AGENTS.md](AGENTS.md), [docs/agents/structure.md](docs/agents/structure.md) y [docs/agents/code-style.md](docs/agents/code-style.md) (en inglés).

## Licencia

Al contribuir, aceptas que tu contribución se publique bajo la [licencia MIT](LICENSE).
