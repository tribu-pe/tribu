import { DocumentType } from '../../catalogs/shared';
import { affectedDocument } from '../../documents/predicates';
import { Rule } from '../rule';

// nota-credito-2.0.csv: for invoices SUNAT rejects a currency mismatch.
export const currencyMatchesAffectedInvoice = Rule.define({
  id: 'note/currency-matches-affected-invoice',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '3209',
  effectiveFrom: '2018-01-01',
  why: 'A Note must be in the same currency as the Invoice it modifies.',
  fix: 'Pass the currency of the modified Invoice.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document, context) {
    const affected = affectedDocument(context);
    if (affected === undefined || affected.type.code !== DocumentType.Invoice.code) return true;
    return document.currency.code === affected.currency.code ? true : { path: 'currency' };
  },
});
