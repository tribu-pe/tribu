import { Catalog } from '../catalog';

const CATALOGS = 'sources/sunat/reglas-validacion-2026-08-26/catalogos.csv';

/** Catalog 10: why a Debit Note (nota de débito) modifies an invoice or receipt. */
export const Reason = Catalog.define('10', {
  source: CATALOGS,
  entries: {
    Interest: { code: '01', name: 'Intereses por mora' },
    ValueIncrease: { code: '02', name: 'Aumento en el valor' },
    Penalty: { code: '03', name: 'Penalidades/ otros conceptos' },
  },
});
