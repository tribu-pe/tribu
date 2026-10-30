import { DocumentType } from '../../catalogs/shared';
import { Status } from '../../results/status';
import { Rule } from '../rule';

// nota-credito-2.0.csv: the modified document must not be voided.
export const affectedNotVoided = Rule.define({
  id: 'note/affected-not-voided',
  appliesTo: [DocumentType.CreditNote, DocumentType.DebitNote],
  sunatCode: '2120',
  effectiveFrom: '2018-01-01',
  why: 'A Note cannot modify a document that was voided.',
  fix: 'Check the status of the Record the Note modifies.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/nota-credito-2.0.csv',
  check(_document, context) {
    return context.affected?.status === Status.Voided ? { path: 'modifies' } : true;
  },
});
