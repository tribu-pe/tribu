import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// factura-2.0.csv: the SUNAT product code is optional; when present it must be 8 digits.
export const classificationFormat = Rule.define({
  id: 'item/classification-format',
  appliesTo: [
    DocumentType.Invoice,
    DocumentType.Receipt,
    DocumentType.CreditNote,
    DocumentType.DebitNote,
  ],
  sunatCode: '3496',
  effectiveFrom: '2026-01-31',
  why: 'The SUNAT product code is optional, but when present it must be 8 digits.',
  fix: 'Pass an 8-digit classification or omit it.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/control-de-cambios.csv',
  check(document) {
    for (const [index, item] of document.items.entries()) {
      if (item.classification !== undefined && !/^\d{8}$/.test(item.classification)) {
        return { path: `items[${index}].classification` };
      }
    }
    return true;
  },
});
