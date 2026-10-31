# Tribu

Tribu issues Peruvian electronic payment documents (comprobantes de pago electrónicos) and reports them to SUNAT, the Peruvian tax authority. This glossary fixes the English words the project uses for SUNAT's Spanish concepts.

## Documents

**Document**:
Any electronic payment document Tribu issues: an Invoice, Receipt, Credit Note or Debit Note. SUNAT calls it a CPE (comprobante de pago electrónico).
_Avoid_: Voucher, bill, comprobante

**Invoice**:
A sale to a buyer identified by RUC that lets the buyer use the tax as credit (factura, type 01).
_Avoid_: Bill, factura

**Receipt**:
A sale to a final consumer, which gives the buyer no tax credit (boleta de venta, type 03).
_Avoid_: Ticket, boleta, sales slip

**Credit Note**:
A document that reduces or cancels a previously issued Invoice or Receipt (nota de crédito, type 07).
_Avoid_: Refund, nota de crédito

**Debit Note**:
A document that increases the amount of a previously issued Invoice or Receipt (nota de débito, type 08).
_Avoid_: Surcharge, nota de débito

**Affected Document**:
The single Invoice or Receipt that a Credit Note or Debit Note modifies.
_Avoid_: Original, parent, referenced document

**Reason**:
The official catalog code that says why a Credit Note or Debit Note is issued (catalogs 09 and 10).
_Avoid_: Motive, cause

## Identity

**Issuer**:
The business that issues the Document, identified by its RUC (emisor).
_Avoid_: Seller, company, emitter

**Customer**:
The person or business the Document is issued to (adquirente).
_Avoid_: Buyer, client, receiver, recipient

**RUC**:
The 11-digit taxpayer number that SUNAT assigns to businesses and self-employed people.

**DNI**:
The 8-digit national identity number of a Peruvian person.

**Identity Document**:
The document that identifies a Customer, typed by catalog 06: RUC, DNI, carnet de extranjería, passport and others.
_Avoid_: ID type, document kind

**Anonymous Customer**:
A Customer of a Receipt who is not identified, allowed only while the Receipt total does not exceed S/ 700.
_Avoid_: Walk-in customer, clientes varios, generic customer

**Series**:
A 4-character code that groups a sequence of Documents; its first letter shows the document family (F for Invoices and their notes, B for Receipts and their notes).
_Avoid_: Prefix, serie

**Number**:
The sequential integer of a Document within its Series (correlativo). A Series-Number pair, such as F001-123, identifies a Document and never repeats.
_Avoid_: Correlative, counter, sequence

## Amounts

**Unit Price**:
The price of one unit including tax: what the Customer pays (precio unitario).
_Avoid_: Price with tax, gross price

**Unit Value**:
The price of one unit excluding tax: what SUNAT taxes (valor unitario).
_Avoid_: Net price, base price

**Item**:
One line of a Document: a good or service with its description, quantity and price (ítem).
_Avoid_: Line, product, row, detail

**Product Code**:
The Issuer's own code for an Item, such as a SKU (código de producto).
_Avoid_: SKU, internal code

**SUNAT Product Code**:
The official 8-digit classification of an Item from catalog 25, based on UNSPSC (código de producto SUNAT).
_Avoid_: Product category, SUNAT code

**Item Value**:
The quantity multiplied by the Unit Value, before tax (valor de venta por ítem).
_Avoid_: Subtotal, line amount, line value

**IGV**:
Peru's general sales tax (Impuesto General a las Ventas).
_Avoid_: VAT, sales tax

**IGV Regime**:
The legal IGV status of an Issuer, which decides the rate it charges: general, or reduced for small restaurants, hotels and tourist lodging (Ley 31556).
_Avoid_: Tax rate setting, tax mode

**Payment Terms**:
Whether an Invoice is paid in cash or on credit (forma de pago: contado or crédito).
_Avoid_: Payment type, payment mode

**Installment**:
One dated payment of a credit Invoice (cuota). All installments add up to the amount pending payment.
_Avoid_: Quota, payment, fee

**Detracción**:
The share of the total, IGV included, that the Customer deposits into the Issuer's Banco de la Nación account instead of paying it to the Issuer, for goods and services SUNAT lists (SPOT, catalog 54). The Issuer may use that money only to pay its taxes. It is not a discount: the amount pending payment excludes it, the total does not.
_Avoid_: Withholding, retention, deduction

**Tax Affectation**:
How a line relates to IGV: taxed, exempt, unaffected, free of charge or export (afectación del IGV, catalog 07).
_Avoid_: Tax type, tax status

## Reporting to SUNAT

**CDR**:
SUNAT's signed reply to a submitted Document, saying whether it was accepted, accepted with Observations or rejected (constancia de recepción).
_Avoid_: Receipt, response, acknowledgement

**Observation**:
A warning inside an accepted CDR that does not invalidate the Document.
_Avoid_: Warning, notice

**Daily Summary**:
The batch in which an Issuer reports a day's Receipts and their notes to SUNAT (resumen diario).
_Avoid_: Batch, daily report

**Voided Documents**:
The communication that tells SUNAT a set of Invoices and their notes are cancelled (comunicación de baja).
_Avoid_: Void, cancellation, annulment, baja

**Ticket**:
The identifier SUNAT returns for an asynchronous submission (a Daily Summary or Voided Documents), used later to obtain its CDR.
_Avoid_: Job ID, tracking number

### States

**Issued**:
The state of a Document that is built and signed but not yet reported to SUNAT, such as a Receipt held for a Daily Summary.
_Avoid_: Created, pending, draft

**Processing**:
The state of a submission SUNAT has received under a Ticket but not finished evaluating.
_Avoid_: Pending, queued, in progress

**Accepted**:
The state of a Document SUNAT has approved, with or without Observations.
_Avoid_: Approved, valid, success

**Rejected**:
The state of a submission SUNAT has refused because of its content. A rejected Invoice or note has no legal effect, yet its Number stays used; a rejected Daily Summary or Voided Documents counts as never sent.
_Avoid_: Failed, invalid, error

**Unconfirmed**:
The state of a submission that was sent but got no answer, so nobody knows whether SUNAT received it.
_Avoid_: Unreachable, failed, timeout, lost

**Voided**:
The state of a previously Accepted Document that has since been cancelled through Voided Documents or a Daily Summary.
_Avoid_: Cancelled, annulled, deleted

### Records and delivery

**Record**:
Everything the Issuer must keep about one Document or submission: its data, signed XML, CDR, Ticket and current state.
_Avoid_: Result, response, entry

**Printed Representation**:
The human-readable version of a Document handed to the Customer, such as a PDF or a till slip, carrying SUNAT's QR code (representación impresa).
_Avoid_: PDF, printout, voucher

**OSE**:
A company authorized by SUNAT to validate Documents on SUNAT's behalf before they reach it (Operador de Servicios Electrónicos).
_Avoid_: Provider, PSE, intermediary

## Rules and data

**Catalog**:
An official SUNAT code list, such as document types, units or Reasons, each entry valid between dates.
_Avoid_: Enum, lookup table

**Rule**:
A SUNAT requirement a Document must meet, with the date it takes effect and the regulation it comes from.
_Avoid_: Validation, constraint, check

**Effective Date**:
The date from which a Rule or Catalog entry applies, compared against the Document's issue date, not today's date.
_Avoid_: Start date, valid from

## Access

**Environment**:
Which SUNAT system receives the Documents: beta (tests, no legal effect) or production (legally binding).
_Avoid_: Mode, stage

**SOL Credentials**:
The user and password of SUNAT's online portal (Clave SOL), which also authenticate submissions.
_Avoid_: Login, API key

**Certificate**:
The digital certificate the Issuer uses to sign every Document.
_Avoid_: Key, signature file
