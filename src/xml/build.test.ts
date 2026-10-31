import { describe, expect, test } from 'vitest';
import { aCreditNote, anInvoice, aReceipt, settings } from '../../test/support/documents';
import { all, one, parseXml, text } from '../../test/support/xml';
import { Reason } from '../catalogs/documents/credit-note';
import { Affectation, Currency, Detraccion } from '../catalogs/index';
import { build } from './build';

const numbered = <T extends object>(document: T, number = 123) => ({ ...document, number });

// Structure and values: sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv (ERR codes cited).
// Byte-for-byte expected XML comes later as golden fixtures from documents accepted in beta.
describe('build: invoice header', () => {
  const root = parseXml(build(numbered(anInvoice({ issueDate: '2026-10-23' }))));

  test('is an Invoice', () => {
    expect(root.tagName).toBe('Invoice');
    expect(root.namespaceURI).toBe('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
  });

  test('UBL 2.1 (ERR 2074) and structure version 2.0 (ERR 2072)', () => {
    expect(text(root, 'cbc:UBLVersionID')).toBe('2.1');
    expect(text(root, 'cbc:CustomizationID')).toBe('2.0');
  });

  test('id, issue date, type and currency', () => {
    expect(text(root, 'cbc:ID')).toBe('F001-123');
    expect(text(root, 'cbc:IssueDate')).toBe('2026-10-23');
    expect(text(root, 'cbc:InvoiceTypeCode')).toBe('01');
    expect(text(root, 'cbc:DocumentCurrencyCode')).toBe('PEN');
  });

  test('operation type 0101, domestic sale (catalog 51, ERR 3205)', () => {
    expect(one(root, 'cbc:InvoiceTypeCode').getAttribute('listID')).toBe('0101');
  });

  test('has an empty extension where the signature goes', () => {
    expect(all(root, 'ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent')).toHaveLength(1);
  });

  test('declares the signature in cac:Signature with the issuer RUC (ERR 2078)', () => {
    expect(text(root, 'cac:Signature/cac:SignatoryParty/cac:PartyIdentification/cbc:ID')).toBe(
      '20000000001',
    );
  });

  test('the issuer declares its main establishment, 0000 (ERR 3030)', () => {
    const entity = 'cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity';
    expect(text(root, `${entity}/cac:RegistrationAddress/cbc:AddressTypeCode`)).toBe('0000');
  });

  // firma.csv: every field of cac:Signature is required.
  test('cac:Signature carries its ID, the issuer name and the URI (ERR 2076, 2081, 2083)', () => {
    expect(text(root, 'cac:Signature/cbc:ID')).toBe('SignTribu');
    expect(text(root, 'cac:Signature/cac:SignatoryParty/cac:PartyName/cbc:Name')).toBe(
      'EMPRESA DE PRUEBA SAC',
    );
    expect(
      text(root, 'cac:Signature/cac:DigitalSignatureAttachment/cac:ExternalReference/cbc:URI'),
    ).toBe('#SignTribu');
  });

  test('issuer and customer, with catalog 06 identity types', () => {
    const supplier = 'cac:AccountingSupplierParty/cac:Party';
    expect(text(root, `${supplier}/cac:PartyIdentification/cbc:ID`)).toBe('20000000001');
    expect(one(root, `${supplier}/cac:PartyIdentification/cbc:ID`).getAttribute('schemeID')).toBe(
      '6',
    );
    const customer = 'cac:AccountingCustomerParty/cac:Party';
    expect(text(root, `${customer}/cac:PartyIdentification/cbc:ID`)).toBe('20123456786');
    expect(text(root, `${customer}/cac:PartyLegalEntity/cbc:RegistrationName`)).toBe('CLIENTE SAC');
  });

  test('cash payment terms (ERR 3244, 3245)', () => {
    const [terms] = all(root, 'cac:PaymentTerms');
    expect(terms?.getElementsByTagName('cbc:ID')[0]?.textContent).toBe('FormaPago');
    expect(terms?.getElementsByTagName('cbc:PaymentMeansID')[0]?.textContent).toBe('Contado');
  });

  // factura-2.0.csv validates cbc:Note only if present, and beta accepted Invoices without it.
  test.todo('legend 1000 with the amount in words (optional: beta accepts Invoices without it)');
});

describe('build: invoice line', () => {
  const root = parseXml(
    build(
      numbered(anInvoice({ items: [{ description: 'Galletas', quantity: 3, price: '10.00' }] })),
    ),
  );
  const line = 'cac:InvoiceLine';

  test('Unit Value with up to 10 decimals (ERR 2369)', () => {
    expect(text(root, `${line}/cac:Price/cbc:PriceAmount`)).toBe('8.4745762712');
  });

  test('Unit Price with tax, price type 01 (catalog 16)', () => {
    const price = `${line}/cac:PricingReference/cac:AlternativeConditionPrice`;
    expect(text(root, `${price}/cbc:PriceAmount`)).toBe('10.00');
    expect(text(root, `${price}/cbc:PriceTypeCode`)).toBe('01');
  });

  test('Item Value and IGV with 2 decimals and the document currency (ERR 2071)', () => {
    const value = one(root, `${line}/cbc:LineExtensionAmount`);
    expect(value.textContent).toBe('25.42');
    expect(value.getAttribute('currencyID')).toBe('PEN');
    expect(text(root, `${line}/cac:TaxTotal/cbc:TaxAmount`)).toBe('4.58');
  });

  test('quantity with its unit code', () => {
    const quantity = one(root, `${line}/cbc:InvoicedQuantity`);
    expect(quantity.textContent).toBe('3');
    expect(quantity.getAttribute('unitCode')).toBe('NIU');
  });

  test('taxed: affectation 10 and tax scheme 1000 IGV VAT (catalogs 07 and 05)', () => {
    const category = `${line}/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory`;
    expect(text(root, `${category}/cbc:TaxExemptionReasonCode`)).toBe('10');
    expect(Number(text(root, `${category}/cbc:Percent`))).toBe(18);
    expect(text(root, `${category}/cac:TaxScheme/cbc:ID`)).toBe('1000');
    expect(text(root, `${category}/cac:TaxScheme/cbc:Name`)).toBe('IGV');
    expect(text(root, `${category}/cac:TaxScheme/cbc:TaxTypeCode`)).toBe('VAT');
  });
});

describe('build: totals', () => {
  const root = parseXml(
    build(
      numbered(
        anInvoice({
          items: [
            { description: 'Teclado', quantity: 2, price: 118 },
            { description: 'Libro', quantity: 1, price: 40, affectation: Affectation.Exempt },
          ],
        }),
      ),
    ),
  );

  test('the document tax total equals the sum of the items', () => {
    expect(text(root, 'cac:TaxTotal/cbc:TaxAmount')).toBe('36.00');
  });

  test('one tax subtotal per tax scheme: 1000 IGV and 9997 EXO', () => {
    const schemes = all(
      root,
      'cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:ID',
    ).map((element) => element.textContent);
    expect(schemes).toEqual(['1000', '9997']);
  });

  test('payable amount', () => {
    expect(text(root, 'cac:LegalMonetaryTotal/cbc:LineExtensionAmount')).toBe('240.00');
    expect(text(root, 'cac:LegalMonetaryTotal/cbc:PayableAmount')).toBe('276.00');
  });
});

describe('build: escaping by construction (ADR 0004)', () => {
  test.each([
    'A & B S.A.C.',
    'MUEBLES <EL ROBLE> SAC',
    'NOMBRE CON ]]> DENTRO',
    'COMILLAS "DOBLES" Y \'SIMPLES\'',
  ])('a customer named %j produces well-formed XML with the exact name', (name) => {
    const root = parseXml(build(numbered(anInvoice({ customer: { ruc: '20123456786', name } }))));
    expect(
      text(root, 'cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName'),
    ).toBe(name);
  });

  test('a description with & and < survives', () => {
    const root = parseXml(
      build(
        numbered(
          anInvoice({ items: [{ description: 'Cable <USB> & cargador', quantity: 1, price: 10 }] }),
        ),
      ),
    );
    expect(text(root, 'cac:InvoiceLine/cac:Item/cbc:Description')).toBe('Cable <USB> & cargador');
  });
});

describe('build: credit payment terms', () => {
  const root = parseXml(
    build(
      numbered(
        anInvoice({
          payment: {
            installments: [
              { amount: 118, due: '2026-11-30' },
              { amount: 118, due: '2026-12-30' },
            ],
          },
        }),
      ),
    ),
  );

  test('Credito with the pending amount, then Cuota001, Cuota002 (ERR 3245, 3246, 3251)', () => {
    const terms = all(root, 'cac:PaymentTerms').map((element) => ({
      means: element.getElementsByTagName('cbc:PaymentMeansID')[0]?.textContent,
      amount: element.getElementsByTagName('cbc:Amount')[0]?.textContent,
      due: element.getElementsByTagName('cbc:PaymentDueDate')[0]?.textContent,
    }));
    expect(terms).toEqual([
      { means: 'Credito', amount: '236.00', due: undefined },
      { means: 'Cuota001', amount: '118.00', due: '2026-11-30' },
      { means: 'Cuota002', amount: '118.00', due: '2026-12-30' },
    ]);
  });
});

describe('build: receipt', () => {
  test('is an Invoice with type 03 and a DNI customer', () => {
    const root = parseXml(build(numbered(aReceipt(), 45)));
    expect(root.tagName).toBe('Invoice');
    expect(text(root, 'cbc:InvoiceTypeCode')).toBe('03');
    expect(
      one(
        root,
        'cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID',
      ).getAttribute('schemeID'),
    ).toBe('1');
  });

  // Milestone 0, question 2: beta accepted "-" / "-", but rejected "-" as the name (ERR 2022).
  test('an Anonymous Customer is coded "-" / "-", named with 3 or more characters', () => {
    const root = parseXml(build(numbered(aReceipt({ customer: undefined }), 46)));
    const party = 'cac:AccountingCustomerParty/cac:Party';
    const id = one(root, `${party}/cac:PartyIdentification/cbc:ID`);
    expect([id.getAttribute('schemeID'), id.textContent]).toEqual(['-', '-']);
    expect(text(root, `${party}/cac:PartyLegalEntity/cbc:RegistrationName`)).toBe(
      'CLIENTES VARIOS',
    );
  });
});

describe('build: credit note', () => {
  const root = parseXml(
    build(numbered(aCreditNote({ modifies: 'F001-123', reason: Reason.Item.Return }), 1)),
  );

  test('is a CreditNote with its own series', () => {
    expect(root.tagName).toBe('CreditNote');
    expect(text(root, 'cbc:ID')).toBe('FC01-1');
  });

  test('declares its Reason from catalog 09 (ERR 2128)', () => {
    expect(text(root, 'cac:DiscrepancyResponse/cbc:ResponseCode')).toBe('07');
    expect(text(root, 'cac:DiscrepancyResponse/cbc:Description').length).toBeGreaterThan(0);
  });

  test('references exactly one Affected Document (ERR 3261)', () => {
    const reference = 'cac:BillingReference/cac:InvoiceDocumentReference';
    expect(all(root, reference)).toHaveLength(1);
    expect(text(root, `${reference}/cbc:ID`)).toBe('F001-123');
    expect(text(root, `${reference}/cbc:DocumentTypeCode`)).toBe('01');
  });

  test('its currency is the document currency', () => {
    expect(text(root, 'cbc:DocumentCurrencyCode')).toBe(Currency.Pen.code);
  });
});

// factura-2.0.csv rules 57, 58, 104–106; docs/research/detracciones-2026-10.md § 4; ADR 0020.
describe('build: invoice with a detracción', () => {
  const issuer = { ...settings().issuer, detraccionAccount: '00-000-123456' };
  const root = parseXml(
    build(
      numbered(
        anInvoice(
          {
            items: [{ description: 'Mantenimiento', quantity: 1, price: 1180 }],
            detraccion: Detraccion.Maintenance,
            payment: { installments: [{ amount: '1038.40', due: '2026-11-30' }] },
          },
          { issuer },
        ),
      ),
    ),
  );
  const terms = (id: string) =>
    all(root, 'cac:PaymentTerms').filter((node) => text(node, 'cbc:ID') === id);

  test('operation type 1001, subject to detracción (catalog 51)', () => {
    expect(one(root, 'cbc:InvoiceTypeCode').getAttribute('listID')).toBe('1001');
  });

  test('legend 2006 (catalog 52, OBS 4265)', () => {
    const note = one(root, 'cbc:Note');
    expect(note.getAttribute('languageLocaleID')).toBe('2006');
    expect(note.textContent).toBe('Operación sujeta a detracción');
  });

  test("the Issuer's Banco de la Nación account (ERR 3034)", () => {
    expect(text(root, 'cac:PaymentMeans/cbc:ID')).toBe('Detraccion');
    expect(text(root, 'cac:PaymentMeans/cbc:PaymentMeansCode')).toBe('001');
    expect(text(root, 'cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID')).toBe('00-000-123456');
  });

  test('the code, rate and amount in PEN (ERR 3127, 3033, 3035, 3208)', () => {
    const [detraccion] = terms('Detraccion');
    if (detraccion === undefined) throw new Error('no Detraccion PaymentTerms');
    expect(text(detraccion, 'cbc:PaymentMeansID')).toBe('020');
    expect(text(detraccion, 'cbc:PaymentPercent')).toBe('12');
    expect(text(detraccion, 'cbc:Amount')).toBe('141.60');
    expect(one(detraccion, 'cbc:Amount').getAttribute('currencyID')).toBe('PEN');
  });

  test('keeps the Payment Terms, with the amount pending net of the detracción', () => {
    const [credit] = terms('FormaPago');
    expect(credit === undefined ? undefined : text(credit, 'cbc:Amount')).toBe('1038.40');
    expect(text(root, 'cac:LegalMonetaryTotal/cbc:PayableAmount')).toBe('1180.00');
  });

  test('an Invoice without a detracción carries none of it (ERR 3128)', () => {
    const plain = parseXml(build(numbered(anInvoice())));
    expect(all(plain, 'cbc:Note')).toHaveLength(0);
    expect(all(plain, 'cac:PaymentMeans')).toHaveLength(0);
  });
});
