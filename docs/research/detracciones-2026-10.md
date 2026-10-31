# Detracciones (SPOT) for electronic Invoices (October 2026)

Checked on 2026-10-31 against SUNAT's validation workbook "Reglas de validación – actualizado al 26.08.2026" (`sources/sunat/reglas-validacion-2026-08-26/`), the resolutions published on sunat.gob.pe, and SUNAT's orientation pages (orientacion.sunat.gob.pe). Every web source below was read on 2026-10-31. Anything marked *unconfirmed* is not stated by SUNAT and must be tested in beta before Tribu relies on it.

Scope: detracciones on goods and services under R.S. 183-2004/SUNAT (operation type `1001`). Operation types `1002`–`1004` are listed only so their extra fields are known.

## 1. What a detracción is

- **SUNAT's explanation** (orientacion.sunat.gob.pe, "01. Detracciones", `/como-funcionan-las-detracciones`): the SPOT "consiste básicamente en la detracción (descuento) que efectúa el comprador o usuario de un bien o servicio afecto al sistema, de un porcentaje del importe a pagar por estas operaciones, para luego depositarlo en el Banco de la Nación, en una cuenta corriente a nombre del vendedor o prestador del servicio". In English: the Customer withholds a percentage of the price and deposits it into the Issuer's account at Banco de la Nación.
- **What the money is for:** the Issuer may use those funds only to pay its tax debts administered by SUNAT: taxes, fines and advance payments, with their interest (same page).
- **Who deposits:** normally the Customer. The Issuer must deposit when it receives the full price without proof of the deposit. Source: "03. En la prestación de servicios" (orientacion.sunat.gob.pe/3142-03-en-la-prestacion-de-servicios-empresas) and "02. En la venta de bienes" (`/3141-02-en-la-venta-de-bienes-empresas`).
- **What the Invoice does:** it tells the Customer that the operation is subject, which goods or services code applies, the rate, the amount and the Issuer's Banco de la Nación account. The deposit itself happens outside the Invoice, through a deposit certificate (*constancia de depósito*, R.S. 183-2004 art. 18).
- **Legal basis:** TUO of D.Leg. 940, approved by D.S. 155-2004-EF. Its art. 2 states the purpose: "generar fondos para el pago de las deudas tributarias … a través de depósitos que deben efectuar los sujetos obligados en las cuentas bancarias que para tal efecto se abran en el Banco de la Nación". Its art. 13 lets SUNAT designate the goods, services and rates. This is quoted in the recitals of R.S. 000086-2025/SUNAT (sunat.gob.pe/legislacion/superin/2025/000086-2025.pdf).

### Regimes

| Regime | Norm | Operation type (catalog 51) |
|---|---|---|
| Goods (Annexes 1 and 2), services and construction contracts (Annex 3) | R.S. 183-2004/SUNAT and amendments | `1001` (`1002` for hydrobiological resources) |
| Road freight transport | R.S. 073-2006/SUNAT | `1004` |
| Public road passenger transport | R.S. 057-2007/SUNAT | `1003` |
| IVAP (arroz pilado) | *Number not checked*; SUNAT lists it as a SPOT operation | none specific |
| Ley 30737 | Ley 30737 | catalog 54 code `099` |

Sources: the R.S. 073-2006 and 057-2007 regimes are named as exclusions g) and h) of Annex 3 numeral 10, and SUNAT's "01. Detracciones" page lists the four kinds of operation. The operation types come from `catalogos.csv`, catalog 51.

## 2. Goods and services and their rates in force on 2026-10-31

**Latest amendments.** The last resolution that changes the SPOT goods and services is **R.S. 000086-2025/SUNAT**: published 2025-03-30, in force from **2025-04-01** for operations whose IGV obligation arises from that date. It:

- moves gold ores and non-gold metallic minerals into Annex 1;
- adds Annex 3 numeral 11 (beneficio de minerales);
- adds codes `044` and `045` to Annex 4;
- repeals Annex 2 numeral 19.

R.S. 000121-2025 and R.S. 000175-2025 only exclude some mineral transfers from the SPOT. SUNAT's 2026 index of superintendence resolutions (sunat.gob.pe/legislacion/superin/2026/indices/indcor.htm, latest entry R.S. 000214-2026) lists no resolution about the SPOT or R.S. 183-2004.

**Sources for the tables.** The rates below come from SUNAT's orientation pages "02. En la venta de bienes" (Annexes 1 and 2) and "03. En la prestación de servicios" (Annex 3), read together with the amending resolutions each table cites. SUNAT publishes no consolidated text for this: its HTML of R.S. 183-2004 (sunat.gob.pe/legislacion/superin/2004/183.htm) stops listing amendments at R.S. 098-2008, and the `.xls` annexes linked from it date from 2007.

**Codes.** The catalog 54 code is the value that goes in `cac:PaymentTerms/cbc:PaymentMeansID` (`catalogos.csv`, catalog 54, "Códigos de bienes y servicios sujetos a detracciones"). Catalog 54 has no rates and no annex numbers. **The code-to-numeral mapping below is matched by name**, because no SUNAT table pairs them, so it is *unconfirmed*.

### Annex 1: goods (sale and transfer), threshold ½ UIT

| Cat. 54 | Annex 1 n.° | Good | Rate | Set by |
|---|---|---|---|---|
| `001` | 1 | Azúcar y melaza de caña | 10% | R.S. 246-2017 |
| `003` | 2 | Alcohol etílico | 10% | R.S. 246-2017 |
| `045` | 3 | Minerales de oro y sus concentrados gravados con el IGV | 10% | R.S. 000086-2025, from 2025-04-01 |
| `034` | 4 | Minerales metálicos no auríferos (gravados con el IGV) | 10% | R.S. 000086-2025, from 2025-04-01 |

### Annex 2: goods (sale), threshold S/ 700 except n.° 6, 16 and 21

| Cat. 54 | Annex 2 n.° | Good | Rate | Note |
|---|---|---|---|---|
| `004` | 1 | Recursos hidrobiológicos | 4% or 10% | 4% only if the supplier holds the fishing permit and appears in SUNAT's "Listado de proveedores sujetos al SPOT con el porcentaje de 4%". Otherwise 10% (note 1 of Annex 2, R.S. 343-2014) |
| `005` | 2 | Maíz amarillo duro | 4% | |
| `007` | 4 | Caña de azúcar | 10% | R.S. 246-2017 |
| `009` | 5 | Arena y piedra | 10% | |
| `010` | 6 | Residuos, subproductos, desechos, recortes, desperdicios y formas primarias derivadas | 15% | No S/ 700 floor |
| `011` | 7 | Bienes gravados con el IGV por renuncia a la exoneración | 10% | R.S. 082-2018, from 2018-04-01 |
| `014` | 9 | Carnes y despojos comestibles | 4% | |
| `016` | 11 | Aceite de pescado | 10% | R.S. 082-2018, from 2018-04-01 |
| `017` | 12 | Harina, polvo y "pellets" de pescado, crustáceos, moluscos y demás invertebrados acuáticos | 4% | |
| `023` | 14 | Leche (only raw whole milk, supplier renounced the exemption) | 4% | R.S. 152-2018, from 2018-06-16 |
| `008` | 15 | Madera | 4% | |
| `031` | 16 | Oro gravado con el IGV | 10% | No S/ 700 floor. Text of item a) amended by R.S. 000086-2025 |
| `032` | 17 | Páprika y otros frutos de los géneros capsicum o pimienta | 10% | R.S. 130-2019, from 2019-08-01 |
| `035` | 20 | Bienes exonerados del IGV | 1.5% | |
| `036` | 21 | Oro y demás minerales metálicos exonerados del IGV | 1.5% | No S/ 700 floor |
| `039` | 22 | Minerales no metálicos | 10% | |
| `041` | 23 | Plomo | 15% | R.S. 130-2019, from 2019-08-01 |

### Annex 3: services and construction, threshold S/ 700

| Cat. 54 | Annex 3 n.° | Service | Rate | Set by |
|---|---|---|---|---|
| `012` | 1 | Intermediación laboral y tercerización | 12% | R.S. 071-2018, from 2018-04-01 |
| `019` | 2 | Arrendamiento de bienes (movable and immovable) | 10% | R.S. 343-2014, from 2015-01-01 |
| `020` | 3 | Mantenimiento y reparación de bienes muebles | 12% | R.S. 071-2018 |
| `021` | 4 | Movimiento de carga | 10% | R.S. 343-2014 |
| `022` | 5 | Otros servicios empresariales (legal, accounting, consulting, engineering, advertising, security, cleaning, packaging: CIIU rev. 3 classes listed in the annex) | 12% | R.S. 071-2018 |
| `024` | 6 | Comisión mercantil | 10% | R.S. 343-2014 |
| `025` | 7 | Fabricación de bienes por encargo | 10% | R.S. 343-2014 |
| `026` | 8 | Servicio de transporte de personas (road, with a document that supports IGV credit) | 10% | R.S. 343-2014 |
| `030` | 9 | Contratos de construcción | 4% | R.S. 265-2013 |
| `037` | 10 | Demás servicios gravados con el IGV (any IGV-taxed service in no other numeral; exclusions a) to m) apply, e.g. financial entities, restaurants, lodging, regulated electricity, road freight and passenger transport) | 12% | R.S. 071-2018 |
| `044` | 11 | Servicio de beneficio de minerales metálicos gravado con el IGV | 12% | R.S. 000086-2025, from 2025-04-01 |

### Other codes in catalog 54

| Code | Name | Status |
|---|---|---|
| `040` | Bien inmueble gravado con IGV | 4% "sin importar su monto" since 2013-02-01 (R.S. 022-2013, orientacion.sunat.gob.pe "04. En la Venta de Inmuebles Gravada con el IGV") |
| `027` | Servicio de transporte de carga | R.S. 073-2006 regime. Required with operation type `1004` (ERR 3129) |
| `028` | Transporte de pasajeros | R.S. 057-2007 regime. Required with operation type `1003` (ERR 3129) |
| `099` | Ley 30737 | Separate regime |
| `002` Arroz, `013` Animales vivos, `015` Abonos, cueros y pieles de origen animal | | In catalog 54, but missing from SUNAT's current Annex 2 table. *Unconfirmed* whether any operation still uses them |
| `038` Espectáculos públicos, `042` Ladrillos…, `043` Estructuras metálicas, `046` Cobre, `047` Plata (all "gravado(s) con el IGV") | | Added to catalog 54 on 2026-07-24 (`control-de-cambios.csv`, line 559). **No resolution found that subjects these goods to the SPOT**, and SUNAT's annex pages don't list them. *Unconfirmed* |

Control de Cambios also records codes added and removed on 2025-04-01 ("por no encontrarse vigentes en la normativa relacionada", lines 502 and 504).

## 3. Thresholds

The "importe de la operación" (operation amount) is "la suma total que queda obligado a pagar el adquirente o usuario … incluidos los tributos que graven la operación" (R.S. 183-2004 art. 1 j.1). In English: the total the Customer owes, IGV included. The same amount is the base for the percentage.

| Annex | Rule | Source |
|---|---|---|
| 1 | Subject "siempre que el importe de la operación sea mayor a media (1/2) UIT". At or below ½ UIT it still applies when the Annex 1 goods carried by one transport unit add up to more than ½ UIT. The UIT is the one in force when transport starts or when the IGV obligation arises, whichever comes first | R.S. 183-2004 art. 2.1 and 3.1 (sunat.gob.pe consolidated text) |
| 2 | Not applicable when "el importe de la operación sea igual o menor a S/ 700.00 … salvo en el caso que se trate de los bienes señalados en los numerales 6, 16, 19 y 21 del Anexo 2". Numeral 19 was repealed by R.S. 000086-2025 | orientacion.sunat.gob.pe "02. En la venta de bienes" |
| 3 | Not applicable when "el importe de la operación sea igual o menor a S/ 700.00" | orientacion.sunat.gob.pe "03. En la prestación de servicios"; art. 13 |
| Real estate (`040`) | 4% "sin importar su monto" (whatever the amount) | orientacion.sunat.gob.pe "04. En la Venta de Inmuebles…" |

Other exclusions for Annexes 2 and 3 (same pages):

- the document does not support IGV credit or expense, unless the Customer is a national public-sector entity;
- the document is one of art. 4 numeral 6.1 of the Reglamento de Comprobantes de Pago, or an electronic document issued by the subjects SUNAT lists: AFPs, vehicle inspection, rail passenger, water freight, air cargo, non-scheduled air passenger;
- a liquidación de compra is issued (Annex 2);
- the service user is non-domiciled (Annex 3).

**The validator does not check any threshold.** No workbook rule ties operation type `1001` to an amount, an annex or the Customer's identity. Deciding whether an operation is subject is the Issuer's responsibility.

## 4. What the Invoice carries

Source: `sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv`, rules N° 57, 58, 104–106 and 174–177 (sheet Factura2_0). All codes below are from that file unless noted.

### Elements

| What | XPath | Value | Codes |
|---|---|---|---|
| Operation type | `/Invoice/cbc:InvoiceTypeCode/@listID` | `1001` "Operación Sujeta a Detracción" (catalog 51; also `1002` hydrobiological, `1003` passenger transport, `1004` freight transport). Valid on "Factura, Boletas" | ERR 3205 (missing), ERR 3206 (not in catalog 51 for the document type) |
| Legend | `/Invoice/cbc:Note/@languageLocaleID` = `2006`, text in `cbc:Note` | Catalog 52 `2006`: Leyenda "Operación sujeta a detracción" | **OBS 4265** when operation type is `1001`–`1004` and legend `2006` is missing. ERR 3014 if a legend code repeats. ERR 3006 if the text is not 1–200 characters |
| Detracción terms: indicator | `/Invoice/cac:PaymentTerms/cbc:ID` | `Detraccion` (no accent) | ERR 3127 if operation type is `1001`–`1004` and no PaymentTerms has ID `Detraccion`. **ERR 3128** if the ID `Detraccion` appears with any other operation type |
| Goods or services code | `/Invoice/cac:PaymentTerms/cbc:PaymentMeansID` | Catalog 54, an3 | ERR 3127 (missing), ERR 3033 (not in catalog 54). ERR 3129 unless `004` for `1002`, `028` for `1003`, `027` for `1004`. Optional attributes: `@schemeName="Codigo de detraccion"` (OBS 4255), `@schemeAgencyName="PE:SUNAT"` (OBS 4256), `@schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo54"` (OBS 4257) |
| Detracción amount | `/Invoice/cac:PaymentTerms/cbc:Amount` | Decimal > 0, n(12,2) | ERR 3035 (missing), ERR 3037 (format) |
| Its currency | `cbc:Amount/@currencyID` | **`PEN`, always** | ERR 3208 "La moneda del monto de la detracción debe ser PEN" |
| Rate | `/Invoice/cac:PaymentTerms/cbc:PaymentPercent` | n(3,5), "(Catálogo N.° 54)" | **"<<< SIN VALIDACIÓN >>>"**: not validated. Return code 3062 ("La tasa o porcentaje de detracción no corresponde al valor esperado") exists in `codigos-retorno.csv`, but no rule uses it |
| Account: indicator | `/Invoice/cac:PaymentMeans/cbc:ID` | `Detraccion` | ERR 3034 if operation type is `1001`–`1004` and no PaymentMeans has ID `Detraccion` |
| Account number | `/Invoice/cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID` | Issuer's Banco de la Nación account, an..100 | ERR 3034 (missing or empty). No format or registry check is listed |
| Payment means | `/Invoice/cac:PaymentMeans/cbc:PaymentMeansCode` | Catalog 59 (e.g. `001` "Depósito en cuenta"), an3 | Only checked if present: ERR 3174. Optional attributes `@listName="Medio de pago"` (OBS 4252), `@listAgencyName="PE:SUNAT"` (OBS 4251), `@listURI="…catalogo59"` (OBS 4253) |

- **Currency.** The detracción amount is always in soles, whatever the document currency. ERR 2071 explicitly exempts "los totales de Percepción y Detracción" from the one-currency rule (rule N° 7). For an operation in foreign currency, the deposit is converted at SBS's weighted average selling rate ("tipo de cambio promedio ponderado venta") on the date the IGV obligation arises or the deposit is due, whichever comes first. If no rate is published that day, the last published rate applies (R.S. 183-2004 art. 20).
- **The workbook checks no arithmetic.** No rule checks that the amount equals the rate × the total, or that the rate matches the code.
- **Content limit.** "Los comprobantes de pago que se emitan por las operaciones sujetas al Sistema: a) No podrán incluir operaciones distintas a éstas." An Invoice for a subject operation may contain only that operation (R.S. 183-2004 art. 19.1, text from R.S. 207-2004). It must also show, "como información no necesariamente impresa", the phrase "Operación sujeta al Sistema de Pago de Obligaciones Tributarias con el Gobierno Central" (art. 19.1 b). Catalog 52 code `2006` is the electronic form of that phrase. Whether the `cbc:Note` text must be SUNAT's catalog wording or the art. 19 phrase is *unconfirmed*: no rule checks the text.

### Extra fields for 1002 and 1004 (not R.S. 183-2004 goods and services)

- `1002`, hydrobiological resources: item properties `cac:Item/cac:AdditionalItemProperty` with catalog 55 codes `3001`–`3006`: vessel registration, vessel name, species, unloading place, quantity, unloading date (ERR 3063, 3130–3134; rules N° 107–112). They mirror R.S. 183-2004 art. 19.2.
- `1004`, road freight: on each line, `cac:Delivery` with the origin and destination ubigeo and address, the trip details, and three reference values (`DeliveryTerms` IDs `01`, `02`, `03`, all in PEN). See ERR 3116–3126 and 3208; rules N° 113–127 add vehicle and leg details as Observations.

### Interaction with Payment Terms (forma de pago) and Installments

The Invoice carries **two kinds of `cac:PaymentTerms`**: one with ID `Detraccion` (above), and the usual `FormaPago` ones, which are `Contado` or `Credito` plus `Cuota001`…. The detracción block does not replace `FormaPago`: ERR 3244 still applies (rules N° 174–177, see [sunat-facts-2026-10.md](sunat-facts-2026-10.md) § Payment terms).

**On credit, the pending amount is net of the detracción.** R.S. 193-2020/SUNAT, Annex I (sunat.gob.pe/legislacion/superin/2020/anexo1-193-2020.pdf), adds item 64-A "Monto neto pendiente de pago" to Annex 1 of R.S. 097-2012. Its description:

> "Es el saldo pendiente de pago del campo importe total de la venta, cesión en uso o del servicio descontando las retenciones del IGV, detracciones que deba efectuar el adquirente o usuario y otras deducciones a las que pueda estar sujeto el comprobante de pago."

In English: the balance still owed out of the total, after deducting IGV retentions, the detracción the Customer must deposit and other deductions. The same rule for SEE-SOL is art. 9 numeral 1 s) ii of R.S. 188-2010, as amended by the same resolution. R.S. 193-2020's final provision sets its start at 2021-04-01; whether a later resolution postponed these fields was not checked. The workbook's own Payment Terms rules have been ERRORs since 2022-01-01.

What the validator actually checks on credit:

| Rule | Check | Code |
|---|---|---|
| N° 175 | The pending amount `cac:PaymentTerms[cbc:ID='FormaPago']/cbc:Amount` exists (RUC Customer) | ERR 3251 |
| N° 175 | Pending amount ≤ `LegalMonetaryTotal/cbc:PayableAmount` | ERR 3265 |
| N° 175 | Installments sum to the pending amount (RUC Customer) | ERR 3319 |
| N° 176 | Each installment ≤ `PayableAmount` | ERR 3266 |

**No rule computes `PayableAmount − detracción`.** An Invoice that states the gross total as pending passes the workbook's rules but breaks Annex 1 item 64-A. `PayableAmount` itself stays the full total: the detracción is not a discount.

On a cash Invoice (`Contado`), `FormaPago` carries no amount, so there is nothing to net.

## 5. Rounding

R.S. 183-2004, Quinta Disposición Final "Procedimiento de redondeo" (added by R.S. 178-2005, in force from 2005-10-01; text as published on sunat.gob.pe/legislacion/superin/2004/183.htm):

> "El depósito se podrá efectuar sin incluir decimales. … se deberá considerar el número entero que resulte de aplicar los porcentajes … sobre el importe de la operación, y emplear el siguiente procedimiento de redondeo en función al primer decimal: Si la fracción es inferior a cinco (5), el valor permanecerá igual, suprimiéndose el decimal. Si la fracción es igual o superior a cinco (5), el valor se ajustará a la unidad inmediata superior."

In English: the deposit **may** be made in whole soles, rounded half-up on the first decimal. "Podrá" makes it optional. The XML field accepts 2 decimals (n(12,2), ERR 3037). Which value the Invoice should state when the deposit is rounded (exact or whole soles) is *unconfirmed*. So is which value the net pending amount should subtract.

## 6. Which documents can carry it

| Document | Detracción fields | Source |
|---|---|---|
| Invoice | Required for operation types `1001`–`1004` (rules N° 104–106); forbidden otherwise (ERR 3128) | `factura-2.0.csv` |
| Receipt | Same elements and codes (rules N° 93–95, OBS 4265, ERR 3127/3128/3033/3034/3035/3037/3208). Catalog 51 allows `1001`–`1004` on "Boletas" | `boleta-2.0.csv`, `catalogos.csv` |
| Debit Note | Optional, not tied to an operation type: `/DebitNote/cac:PaymentTerms` and `cac:PaymentMeans` with ID `Detraccion` must appear together (ERR 3313, ERR 3314), with the same code, amount and PEN rules (rules N° 61–63; added 2021-01-09, `control-de-cambios.csv` line 417) | `nota-debito-2.0.csv` |
| Credit Note | **No detracción fields** in the sheet | `nota-credito-2.0.csv` |

- **Receipts.** The law excludes documents that do not support IGV credit from Annexes 2 and 3, unless the Customer is a public-sector entity. Annex 1 has no such exclusion. A real-estate sale on a document without IGV credit makes the Issuer deposit itself (orientation pages cited in § 3). A Receipt therefore carries a detracción only in those cases.
- **Notes.** No rule links a Credit Note or Debit Note to its Affected Document's detracción: there is no check of the code or the amount against the Invoice. Whether a Credit Note may carry the block, and what SUNAT does if it does, is *unconfirmed*.

## 7. Workbook rules about detracción (Invoice)

| Code | Type | Meaning |
|---|---|---|
| 3205 | ERROR | Operation type missing |
| 3206 | ERROR | Operation type not in catalog 51 for this document type |
| 4265 | OBSERV | Operation type `1001`–`1004` without legend `2006` |
| 3127 | ERROR | Operation type `1001`–`1004` without PaymentTerms `Detraccion`, or that block lacks the catalog 54 code |
| 3128 | ERROR | PaymentTerms `Detraccion` present with another operation type |
| 3033 | ERROR | Code not in catalog 54 |
| 3129 | ERROR | Code does not match `1002` (`004`), `1003` (`028`) or `1004` (`027`) |
| 4255 / 4256 / 4257 | OBSERV | Wrong `@schemeName` / `@schemeAgencyName` / `@schemeURI` on the code |
| 3034 | ERROR | Operation type `1001`–`1004` without PaymentMeans `Detraccion`, or no account number |
| 3174 | ERROR | `PaymentMeansCode` present but not in catalog 59 |
| 4251 / 4252 / 4253 | OBSERV | Wrong list attributes on `PaymentMeansCode` |
| 3035 | ERROR | Detracción amount missing |
| 3037 | ERROR | Detracción amount not a positive decimal n(12,2) |
| 3208 | ERROR | Detracción amount (or a `1004` reference value) not in PEN |
| 2071 | ERROR | Currency mismatch in totals (detracción totals exempt) |
| 3063, 3130–3134 | ERROR | `1002` item properties missing |
| 3116–3126 | ERROR | `1004` delivery data missing or malformed |
| 4200, 4271–4278 | OBSERV | `1004` leg and vehicle details malformed |
| 3313 / 3314 | ERROR | Debit Note only: code without account, or account without code |

Not used by any rule: 3062 (rate mismatch) and 2428 ("Comprobante no cumple con grupo de facturas con detracciones"). Both exist only in `codigos-retorno.csv`.

## 8. R.S. 000048-2026/SUNAT (from 2027-01-01)

- The resolution text (sunat.gob.pe/legislacion/superin/2026/000048-2026.pdf) never mentions detracciones or the SPOT.
- Its annex (`anexo-000048-2026.pdf`) touches detracción only once: catalog 51 code `0101` is renamed "Venta interna no sujeta a Detracción, Retención o Percepción".
- The workbook's change log records the new name as "…no sujeta a Detracción o Percepción", without "Retención" (`control-de-cambios.csv` line 517). Its start moved to 2027-01-01 (line 560; R.S. 000143-2026).
- Codes `1001`–`1004`, the legend and the PaymentTerms/PaymentMeans rules are unchanged.

## What Tribu would need

**Inputs only the caller can provide:**

- that the operation is subject to detracción. Tribu cannot know it: it depends on the goods or service, the annex and legal exclusions, and the validator does not check it;
- the catalog 54 code;
- the rate, because it is not derivable from the code alone. Hydrobiological resources are 4% or 10% depending on a monthly SUNAT list, and the code-to-numeral mapping is unconfirmed;
- the Issuer's Banco de la Nación account number;
- for foreign-currency Invoices, the SBS exchange rate used to convert the amount to soles;
- optionally, the payment means (catalog 59).

**Derivable once those are given:**

- operation type `1001`;
- legend `2006` and its text;
- both `Detraccion` blocks, with fixed IDs and attributes;
- the amount: rate × the Invoice total including IGV, in PEN, 2 decimals or rounded to whole soles;
- on credit: the pending amount = total − detracción (converted to the document currency when needed), and Installments that add up to it.

**Checks Tribu could make that SUNAT doesn't:** the rate matches the code (for the codes with one rate); the amount matches rate × total; the pending amount is net of the detracción; the Invoice includes no other operations (art. 19.1 a).

## Beta results (2026-10-31)

`test/beta/detraccion.test.ts` sent two Invoices for code `020` at 12% over S/ 1,180.00, with a made-up account `00-000-123456`. Both were accepted without Observations: one in cash, and one on credit whose amount pending and single Installment were 1,038.40, the total less the detracción. So beta does not check the account number (item 3, for beta only), and it accepts `PaymentMeansCode` `001` and `PaymentPercent` `12`.

## Unconfirmed

1. The catalog 54 code ↔ annex numeral mapping (matched by name; SUNAT publishes no joint table).
2. Codes `038`, `042`, `043`, `046`, `047` (added to catalog 54 on 2026-07-24): no norm found that subjects them. Also `002`, `013`, `015`, which are absent from the current Annex 2 table.
3. Whether beta or production validates the Banco de la Nación account number (format or registry). The workbook lists no check beyond "not empty".
4. Whether `PaymentMeansCode` is expected, and with which catalog 59 value (the workbook checks it only if present).
5. Whether SUNAT checks `PaymentPercent`, or the amount against rate × total, despite "SIN VALIDACIÓN" (code 3062 exists).
6. The amount to state when the deposit is rounded to whole soles, and which value the net pending amount subtracts.
7. For a foreign-currency credit Invoice: how the pending amount (document currency) should subtract a detracción stated in PEN, and which exchange rate the Issuer should use at issue time.
8. Whether beta rejects a credit Invoice whose pending amount is not net of the detracción. Expected: accepted, since only ERR 3265 ≤ total applies.
9. Whether more than one `Detraccion` PaymentTerms (several codes in one Invoice) is accepted. The rules say "al menos un", and art. 19.1 a) suggests one operation per Invoice.
10. The required text of the legend `cbc:Note` (catalog 52 wording vs. the art. 19.1 b) phrase).
11. Whether a Credit Note may carry the detracción blocks, and what SUNAT answers if it does.
12. The IVAP resolution number and the regime details of codes `027`/`028`/`099`, which are outside this scope.
13. Whether later amendments changed the rounding rule. SUNAT's consolidated HTML lists no amendment after 2008.
