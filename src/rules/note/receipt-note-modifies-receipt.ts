import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// nota-credito-2.0.csv: a note whose series starts with B must modify a receipt.
export const receiptNoteModifiesReceipt = Rule.define({
  id: 'note/receipt-note-modifies-receipt',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '2399',
  effectiveFrom: '2018-01-01',
  why: 'A B-series Note modifies a Receipt, not an Invoice.',
  fix: 'Use the invoice-note series from series.creditNote.invoice (FC01) for an Invoice.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document) {
    const modifies = 'modifies' in document ? document.modifies : '';
    return document.series.startsWith('B') && modifies.startsWith('F') ? { path: 'series' } : true;
  },
});
