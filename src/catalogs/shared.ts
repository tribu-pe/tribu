import { Catalog } from './catalog';

const CATALOGS = 'sources/sunat/reglas-validacion-2026-08-26/catalogos.csv';

export const DocumentType = Catalog.define('01', {
  source: CATALOGS,
  entries: {
    Invoice: { code: '01', name: 'Factura' },
    Receipt: { code: '03', name: 'Boleta de venta' },
    CreditNote: { code: '07', name: 'Nota de crédito' },
    DebitNote: { code: '08', name: 'Nota de débito' },
  },
});

export const Currency = Catalog.define('02', {
  source: `${CATALOGS} (ISO 4217)`,
  entries: {
    Pen: { code: 'PEN', name: 'Sol' },
    Usd: { code: 'USD', name: 'Dólar americano' },
  },
});

export const Unit = Catalog.define('03', {
  source: `${CATALOGS} (UN/ECE Recommendation 20)`,
  entries: {
    Goods: { code: 'NIU', name: 'UNIDAD (BIENES)' },
    Service: { code: 'ZZ', name: 'UNIDAD (SERVICIOS)' },
  },
});

export const Identity = Catalog.define('06', {
  source: CATALOGS,
  entries: {
    NonDomiciledWithoutRuc: { code: '0', name: 'DOC.TRIB.NO.DOM.SIN.RUC' },
    Dni: { code: '1', name: 'Documento Nacional de Identidad' },
    ForeignerId: { code: '4', name: 'Carnet de extranjería' },
    Ruc: { code: '6', name: 'Registro Unico de Contributentes' },
    Passport: { code: '7', name: 'Pasaporte' },
    DiplomaticId: { code: 'A', name: 'Cédula Diplomática de identidad' },
    ResidenceCountry: { code: 'B', name: 'DOC.IDENT.PAIS.RESIDENCIA-NO.D' },
    Tin: { code: 'C', name: 'Tax Identification Number - TIN – Doc Trib PP.NN' },
    Inn: { code: 'D', name: 'Identification Number - IN – Doc Trib PP. JJ' },
    AndeanMigrationCard: { code: 'E', name: 'TAM- Tarjeta Andina de Migración' },
    TemporaryResidencePermit: { code: 'F', name: 'Permiso Temporal de Permanencia - PTP' },
    SafeConduct: { code: 'G', name: 'Salvoconducto' },
    TemporaryWorkPermit: { code: 'H', name: 'Carné Permiso Temp.Perman. - CPP' },
  },
});

export const Affectation = Catalog.define('07', {
  source: CATALOGS,
  entries: {
    Taxed: {
      code: '10',
      name: 'Gravado - Operación Onerosa',
      taxScheme: { code: '1000', name: 'IGV', international: 'VAT' },
    },
    TaxedPrize: {
      code: '11',
      name: 'Gravado – Retiro por premio',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    TaxedDonation: {
      code: '12',
      name: 'Gravado – Retiro por donación',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    TaxedWithdrawal: {
      code: '13',
      name: 'Gravado – Retiro',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    TaxedAdvertising: {
      code: '14',
      name: 'Gravado – Retiro por publicidad',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    TaxedBonus: {
      code: '15',
      name: 'Gravado – Bonificaciones',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    TaxedEmployees: {
      code: '16',
      name: 'Gravado – Retiro por entrega a trabajadores',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    TaxedIvap: {
      code: '17',
      name: 'Gravado - IVAP',
      taxScheme: { code: '1016', name: 'IVAP', international: 'VAT' },
    },
    Exempt: {
      code: '20',
      name: 'Exonerado - Operación Onerosa',
      taxScheme: { code: '9997', name: 'EXO', international: 'VAT' },
    },
    ExemptTransfer: {
      code: '21',
      name: 'Exonerado - Transferencia gratuita',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    Unaffected: {
      code: '30',
      name: 'Inafecto - Operación Onerosa',
      taxScheme: { code: '9998', name: 'INA', international: 'FRE' },
    },
    UnaffectedBonus: {
      code: '31',
      name: 'Inafecto – Retiro por Bonificación',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    UnaffectedWithdrawal: {
      code: '32',
      name: 'Inafecto – Retiro',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    UnaffectedMedicalSamples: {
      code: '33',
      name: 'Inafecto – Retiro por Muestras Médicas',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    UnaffectedCollectiveAgreement: {
      code: '34',
      name: 'Inafecto - Retiro por Convenio Colectivo',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    UnaffectedPrize: {
      code: '35',
      name: 'Inafecto – Retiro por premio',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    UnaffectedAdvertising: {
      code: '36',
      name: 'Inafecto - Retiro por publicidad',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    UnaffectedTransfer: {
      code: '37',
      name: 'Inafecto - Transferencia gratuita',
      taxScheme: { code: '9996', name: 'GRA', international: 'FRE' },
    },
    Export: {
      code: '40',
      name: 'Exportación de Bienes o Servicios',
      taxScheme: { code: '9995', name: 'EXP', international: 'FRE' },
    },
  },
});

export const ResponseCode = Catalog.define('response-code', {
  source: 'Manual del Programador §4.1',
  entries: {
    Accepted: { code: '0', name: 'Aceptado' },
    SunatException: { range: ['0100', '0999'], name: 'Excepción de SUNAT' },
    ContributorException: { range: ['1000', '1999'], name: 'Excepción del contribuyente' },
    Rejection: { range: ['2000', '3999'], name: 'Rechazo' },
    Observation: { range: ['4000', null], name: 'Observación' },
  },
});

export const TicketStatus = Catalog.define('ticket-status', {
  source: 'Manual del Programador §2.5',
  entries: {
    Processed: { code: '0', name: 'Procesó correctamente' },
    InProgress: { code: '98', name: 'En proceso' },
    ProcessedWithErrors: { code: '99', name: 'Proceso con errores' },
  },
});

/** The four document types v0.1 calculates; `preview()` and `validate()` take one. */
export type DocumentTypeEntry =
  | typeof DocumentType.Invoice
  | typeof DocumentType.Receipt
  | typeof DocumentType.CreditNote
  | typeof DocumentType.DebitNote;
