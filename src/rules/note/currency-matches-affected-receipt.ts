import { DocumentType } from '../../catalogs/shared';
import { affectedDocument } from '../../documents/predicates';
import { Rule } from '../rule';

// nota-credito-2.0.csv: for receipts SUNAT only observes a currency mismatch.
export const currencyMatchesAffectedReceipt = Rule.define({
  id: 'note/currency-matches-affected-receipt',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '4368',
  effectiveFrom: '2021-01-09',
  why: 'A Note should be in the same currency as the Receipt it modifies; SUNAT observes it.',
  fix: 'Pass the currency of the modified Receipt.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document, context) {
    const affected = affectedDocument(context);
    if (affected === undefined || affected.type.code !== DocumentType.Receipt.code) return true;
    return document.currency.code === affected.currency.code ? true : { path: 'currency' };
  },
});
