import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// nota-credito-2.0.csv: a note whose series starts with F must modify an invoice.
export const invoiceNoteModifiesInvoice = Rule.define({
  id: 'note/invoice-note-modifies-invoice',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '2116',
  effectiveFrom: '2018-01-01',
  why: 'An F-series Note modifies an Invoice, not a Receipt.',
  fix: 'Pass the Series-Number of an Invoice, or use the receipt-note series.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document) {
    const modifies = 'modifies' in document ? document.modifies : '';
    return document.series.startsWith('F') && modifies.startsWith('B') ? { path: 'series' } : true;
  },
});
