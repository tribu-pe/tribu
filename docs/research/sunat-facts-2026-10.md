# SUNAT facts verified for the design (October 2026)

Checked against official sources on 2026-10-23. The main source is SUNAT's validation workbook "Reglas de validación – actualizado al 26.08.2026" (cpe.sunat.gob.pe/guias-y-manuales), plus the resolutions cited below. Anything marked *unconfirmed* is not stated by SUNAT and must be tested in beta before Tribu relies on it.

**Pending reform:** R.S. 000048-2026/SUNAT amends R.S. 097-2012. Its start was moved from 2026-08-01 to **2027-01-01** by R.S. 000143-2026/SUNAT.

## Deadlines

| What | Deadline | If late | Source |
|---|---|---|---|
| Invoice and its notes | Issue date, or up to 3 calendar days counted from the day after issue | ERROR 2108 (rejected) | R.S. 097-2012 art. 12.1 c), text from R.S. 000003-2023 |
| Issue date in the future | IssueDate more than 2 days after the sending date | ERROR 2329 | Validation workbook |
| Receipt sent individually (sendBill) | Issue date, or up to 5 calendar days from the day after issue | ERROR 1079: summary only | R.S. 097-2012 art. 7.3, text from R.S. 114-2019 |
| Daily Summary | Issue date, or by the 7th calendar day after issue | OBS 4443 (observation only) | R.S. 097-2012 art. 21.1 b) |
| Voided Documents | Legal text until 2026-12-31: 7 calendar days from the day after the accepted CDR. **The validator counts from the issue date.** From 2027-01-01 the law also counts from generation | ERROR 2957 | Art. 14.1 b); R.S. 000048-2026 art. 9 |

Receipts are voided through the Daily Summary with status "anulado" (code 3), under the same 7-day limit.

## Customer identification

- A Receipt must identify the Customer when they ask, or when its total exceeds **S/ 700.00** (Daily Summary ERROR 2514).
- *Unconfirmed:* how to code an anonymous Customer. The rules accept `schemeID="-"` and number `"-"` (ERR 2016, ERR 2018), and this is consistent with SUNAT's guides, but SUNAT has no explicit statement. Catalog 06 code `0` means a non-domiciled buyer without RUC, not an anonymous one.
- Catalog 06 codes: `0` no-dom. without RUC, `1` DNI, `4` carnet de extranjería, `6` RUC, `7` passport, `A` diplomatic ID, `B` ID from country of residence, `C` TIN, `D` IN, `E` TAM, `F` PTP, `G` salvoconducto, `H` CPP.
- An Invoice requires a RUC (`6`) except for exports (operation types 0200–0208, 0401), 0112 and Tax Free 2106 (ERR 2800).

## IGV rate

- Total standard rate: **18%**. The IGV/IPM split changes by year (Ley 32387): 2026 15.5 + 2.5, 2027 15 + 3, 2028 14.5 + 3.5, 2029 14 + 4. UBL carries only the combined rate.
- Reduced rate for MYPE restaurants and hotels (Ley 31556, amended by Ley 32219): **10.5% in 2026** (8 + 2.5), **15% in 2027** (12 + 3). No rule exists after 2027-12-31. Issuers not in SUNAT's "Autorizado a IGV 10%" register get OBS 4439.
- The validator accepts 18.00 or 10.50 (ERR 3291, 3279). The 26.08.2026 workbook does not mention 15% yet.
- Every taxed line in a Document must use the same rate (ERR 3462).
- UBL field: `cac:TaxCategory/cbc:Percent`, a percentage, format n(3,5).

## Decimals and tolerance

- Unit Value, Unit Price and quantity: up to **10 decimals**, n(12,10) (ERR 2369, 2367, 2025).
- Line and total amounts: **2 decimals**, n(12,2).
- **Positive amounts.** On an onerous operation SUNAT rejects zero and negatives (`factura-2.0.csv`; the Notes repeat it in `nota-credito-2.0.csv` and `nota-debito-2.0.csv`, and Receipts in `boleta-2.0.csv`):
  - quantity `cbc:InvoicedQuantity`: zero is ERR 2024, a non-positive or malformed decimal is ERR 2025;
  - Unit Value `cac:Price/cbc:PriceAmount`: "decimal positivo … y diferente de cero", ERR 2369;
  - Unit Price `cac:AlternativeConditionPrice/cbc:PriceAmount`: the same rule, ERR 2367;
  - line value of sale `cbc:LineExtensionAmount`: the same rule on the 2-decimal amount, ERR 2370. A price that rounds the line to 0.00 is therefore rejected.
- **Free operations (tax code 9996) are unconfirmed.** Row ERR 2369 asks for a non-zero Unit Value, while ERR 2640 reads as if a free line should carry only a reference amount. The workbook seems to contradict itself; check it in beta before Tribu supports free operations. v0.1 does not, so Tribu requires every amount of a line to be positive.
- **Number.** The id is `<Serie>-<Número>`, `an..13` (ERR 1035 when it differs from the file name), so the Number has at most 8 digits. The workbook does not say whether 0 is valid: *unconfirmed*. Tribu rejects only what is not a whole number of 0 to 99999999.
- **Dates** (`cbc:IssueDate`, `cbc:PaymentDueDate`) are `YYYY-MM-DD`, `an10`.
- Every arithmetic check tolerates **±1**. On Invoices it is an ERROR (3270, 3271, 3103, 3292, 3277, 3278, 3291, 3294, 3279, 3280); on Receipts it is mostly an OBSERVATION (4287–4312). `PayableRoundingAmount` must be ≤ 1 (ERR 3303).
- SUNAT publishes a list of "Observaciones que migran a Error". Check it before relying on an observation staying non-blocking.

## Payment terms (forma de pago)

Validation workbook, sheet Factura2_0, rules 174–177. All are ERRORs since 2022-01-01:

- Every Invoice needs a `cac:PaymentTerms` with `cbc:ID` = `FormaPago` (ERR 3244). Its `cbc:PaymentMeansID` is `Contado` or `Credito` (ERR 3245), and installments are `Cuota001`, `Cuota002`… (ERR 3246).
- An Invoice cannot be both cash and credit (ERR 3247), and an installment ID cannot repeat (ERR 3248).
- A credit Invoice to a RUC customer needs:
  - at least one installment (ERR 3249);
  - the net amount pending payment (ERR 3251);
  - installments that sum to that pending amount (ERR 3319);
  - a pending amount no greater than `PayableAmount` (ERR 3265).
- With no detracción, retención or perception, the pending amount equals the total.

## Printed Representation

- QR content, pipe-separated with a trailing pipe: `RUC|DOCUMENT TYPE|SERIES|NUMBER|TOTAL IGV|DOCUMENT TOTAL|ISSUE DATE|CUSTOMER DOC TYPE|CUSTOMER DOC NUMBER|`. Values use the XML formats.
- Symbology: QR Code 2005 (ISO/IEC 18004), error correction level Q, UTF-8, at most 6×6 cm.
- **The signature hash is not part of the QR.** It belonged to the PDF417 barcode, and since 2020-01-01 only the QR is valid (R.S. 309-2018).
- Sources: R.S. 357-2015 Annex C; R.S. 117-2017 Annex B.

## OSE

- OSEs expose the same methods (sendBill, sendSummary, getStatus) with the same ZIP naming. Each OSE publishes its own endpoint, and SUNAT does not guarantee an identical WSDL or authentication.
- An issuer registered with an OSE may issue **only** through it (plus SEE-SOL). SUNAT rejects direct submissions with ERROR 1078 (R.S. 117-2017 art. 12.2, text from R.S. 239-2018).

## Certificates

- Beta: SUNAT says no certificate registered with it is needed. Endpoint `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`, user `[RUC]MODDATOS`, password `MODDATOS`. Beta only covers Invoices, Receipts and notes. A self-signed certificate generated at test time works: beta accepted every document signed with one (Milestone 0, 2026-10-30: [milestone-0-results.md](milestone-0-results.md), question 1).
- Production: the certificate must come from a provider in INDECOPI's ROPS registry (IOFE) **and be registered with SUNAT through SOL** (otherwise ERROR 2325; 2326 if deregistered). SUNAT offers a free Certificado Digital Tributario to eligible taxpayers until 2027-12-31 (R.S. 038-2020).

## Record retention

Keep XML and CDR at least **5 years**, or for the tax prescription period if that is longer (Código Tributario art. 87.7). SEE-Del contribuyente issuers must keep them themselves.

## Return codes

Source: SUNAT, *Manual del Programador – Emisión electrónica desde los Sistemas del Contribuyente* (May 2021), §4.1 "Manejo de errores". The workbook's "CódigosRetorno" sheet holds the current list of 2,077 codes.

| Range | Meaning | Effect |
|---|---|---|
| 0 | Accepted (`cbc:ResponseCode` = "0", Annex 1) | CDR "aceptada" |
| 0100–999 | SUNAT's own exceptions | "No informado": the service throws, and no CDR is generated |
| 1000–1999 | The contributor's exceptions (format and structure) | Same as above |
| 2000–3999 | Errors that reject | CDR "rechazada". **For an Invoice or a note, the Number counts as used and cannot be reused.** For a Daily Summary or Voided Documents, the whole submission counts as not informed and may be resent |
| 4000 and up | Observations | CDR "aceptada con advertencias" |

Each validation rule in the workbook is also marked ERROR or OBSERV individually.

## Ticket status (getStatus)

Source: Manual del Programador §2.5. The `statusCode` values, with their official wording:

| Code | Official wording | Notes |
|---|---|---|
| `0` | "Procesó correctamente" | `content` carries the CDR(s) as a ZIP |
| `98` | "En proceso" | |
| `99` | "Proceso con errores" | `content` carries the CDR(s) as a ZIP |

## CDR lookup for an already-sent document

- Service: "WS de consulta de CDR y estado de envío", `https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService`. It is listed for **production only**: the official lists show no beta endpoint.
- `getStatusCdr` takes the RUC, the type (**01, 07 or 08 only**), the series and the number, and returns the CDR as a ZIP.
- `getStatus` on the same service reports only whether the document exists and its state: 0001 accepted, 0002 rejected, 0003 voided, 0011 not found.
- *Unconfirmed:*
  - how to recover the CDR of an individually sent Receipt (type 03) after a lost answer;
  - what SUNAT answers when the same Receipt file is sent again.
- Authentication: the same WS-Security UsernameToken (RUC + SOL user, SOL password). §2.2 says the SOL user must be a **secondary** user with the profile "Envío de documentos electrónicos – Grandes emisores".

## Signature

- The workbook ("Firma" sheet) only requires the signature elements to exist; it does not fix algorithm values. They are:
  - `ds:Signature` with an `@Id`, inside `ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent`;
  - `CanonicalizationMethod`, `SignatureMethod`, `Transform`, `DigestMethod`, `DigestValue`, `SignatureValue` and `X509Certificate`;
  - `Reference/@URI` must be empty.
- The document also needs a `cac:Signature` block: `cbc:ID`, a signatory RUC equal to the Issuer's (ERR 2078), the signatory name, and `DigitalSignatureAttachment/ExternalReference/cbc:URI`. It is easy to forget, because it is not part of XMLDSig.
- The Manual del Programador's examples use inclusive C14N (`http://www.w3.org/TR/2001/REC-xml-c14n-20010315`), `rsa-sha1`, `enveloped-signature` and `sha1` digest. Whether SHA-256 is also accepted is *unconfirmed*.

## Duplicate submissions

| Code | Wording | Range |
|---|---|---|
| 1033 | "El comprobante fue registrado previamente con otros datos" | Exception range: not informed, no CDR |
| 2109 | Same wording | Error range |
| 0402 / 2403 | "La numeracion o nombre del documento ya ha sido enviado anteriormente" | |
| 2223 | "El archivo ya fue presentado anteriormente" | |
| 2324 | Voided Documents file already presented | |
| 2323 | Document already in a Voided Documents | |

On Invoices and Receipts, 1033 applies when the series-number is already registered with status 1. *Unconfirmed:* which code an identical re-send gets (rather than one "with other data"), whether a CDR comes back, and how beta behaves.

## SUNAT Product Code (catalog 25)

UNSPSC v14_0801, per catalog 25 of Annex V of R.S. 340-2017/SUNAT. It is not a minimum requirement on Invoices or Receipts. Source: cpe.sunat.gob.pe/informacion_general/codigoproducto.

## Units

Catalog 03 is UN/ECE Recommendation 20: `NIU` = unit (goods), `ZZ` = unit (services). Invalid codes get ERR 2936.

## Coming on 2027-01-01 (R.S. 000048-2026)

- Each note modifies a single document.
- The SUNAT product code (catalog 25) is still **optional** on Invoices, Receipts and notes, but when it is present it must be valid: 8 digits, listed in catalog 25, 25.1, 25.2 or 25.3, or `00000000` / `99999999`. That check (ERR 3496) changes from observation to ERROR. It is mandatory only on the purchase settlement (liquidación de compra, ERR 3506), which is outside Tribu's scope. Source: validation workbook, "Control de Cambios" entries of 2026-04-24.
- New debit note type 13.
- Free operations are broken down in the Daily Summary.
- The new voiding deadline described above.
