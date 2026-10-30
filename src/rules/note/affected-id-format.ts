import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// nota-credito-2.0.csv: the modified document's id must be a well-formed Series-Number.
export const affectedIdFormat = Rule.define({
  id: 'note/affected-id-format',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '2117',
  effectiveFrom: '2018-01-01',
  why: 'The modified document id must match [F|B][A-Z0-9]{3}-[0-9]{1,8}.',
  fix: 'Pass modifies as a Series-Number such as F001-123.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(document) {
    const modifies = 'modifies' in document ? document.modifies : '';
    return /^[FB][A-Z0-9]{3}-\d{1,8}$/.test(modifies) ? true : { path: 'modifies' };
  },
});
