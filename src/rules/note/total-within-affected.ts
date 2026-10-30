import { DocumentType } from '../../catalogs/shared';
import { Decimal } from '../../documents/decimal';
import { affectedDocument } from '../../documents/predicates';
import { Rule } from '../rule';

// nota-credito-2.0.csv: a credit note's total must not exceed the modified document's.
export const totalWithinAffected = Rule.define({
  id: 'note/total-within-affected',
  appliesTo: [DocumentType.CreditNote],
  sunatCode: '3286',
  effectiveFrom: '2018-01-01',
  why: 'A Credit Note cannot total more than the document it modifies.',
  fix: 'Lower the returned amounts so they fit within the modified document.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document, context) {
    const affected = affectedDocument(context);
    if (affected === undefined) return true;
    return document.totals.payable.compare(Decimal.from(affected.totals.payable)) > 0
      ? { path: 'items' }
      : true;
  },
});
