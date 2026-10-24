# SUNAT sources

Official SUNAT material that Tribu's Catalogs, Rules and tests are built from, kept in the repository so every reference can be checked offline and every update shows up as a diff. These files are SUNAT's, not Tribu's. Never edit them by hand.

## `reglas-validacion-2026-08-26/`

SUNAT's validation workbook, *Reglas de validación – actualizado al 26.08.2026*, converted to one UTF-8 CSV per sheet.

| | |
|---|---|
| Published at | <https://cpe.sunat.gob.pe/guias-y-manuales> |
| File | `Reglas de validación - actualizado al 26.08.2026.xlsx` |
| SHA-256 of the original `.xlsx` | `cb5e871cfe3b81abea7faf25b156e5d35b21e8c4837979350919926612da73b6` |
| Downloaded | 2026-10-23 |
| Converted with | `python scripts/sunat/xlsx-to-csv.py <workbook.xlsx> <output-dir>` (Python 3 + openpyxl) |

| CSV | Sheet | Contents |
|---|---|---|
| `factura-2.0.csv`, `boleta-2.0.csv`, `nota-credito-2.0.csv`, `nota-debito-2.0.csv` | Factura2_0, Boleta2_0, NotaCredito2_0, NotaDebito2_0 | Field-by-field validation rules of each document: XPath, condition, ERROR or OBSERV, code |
| `resumen-diario-1.1.csv`, `comunicacion-de-baja-1.0.csv` | Resumen Diario1_1, Comunicación de Baja1_0 | Daily Summary and Voided Documents rules |
| `firma.csv`, `general.csv` | Firma, General | Signature elements; checks common to all documents (certificate, OSE authorization) |
| `codigos-retorno.csv` | CódigosRetorno | All return codes (0100–4473) with their official message: the source of `ReturnCode` |
| `catalogos.csv` | Catálogos | Annex V catalogs (01 document types, 06 identity documents, 07 Tax Affectation, 09/10 note Reasons, …): the source of `tribu/catalogs` |
| `control-de-cambios.csv` | Control de Cambios | Dated history of rule changes, such as observations that become errors |
| `listados.csv`, `parametros.csv` | Listados, Parámetros | Lists and parameters that rules refer to |
| other files | Retenciones, Percepciones, DAE, OSE CDR… | Outside v0.1 scope; kept so the workbook stays complete |

Cells keep SUNAT's wording verbatim, including its typos (catalog 06 says "Registro Unico de Contributentes"). Multi-line cells stay inside quoted CSV fields.

## Updating

When SUNAT publishes a new workbook:

1. Add a new folder `reglas-validacion-<date>/`. Never overwrite an old one, since past Documents are validated with the rules of their issue date.
2. Record the new file's URL, SHA-256 and download date in this README.
3. Diff the old and new CSVs. Each change becomes a Catalog or Rule pull request that cites the new folder.
