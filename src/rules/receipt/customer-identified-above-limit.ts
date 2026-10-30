import { DocumentType } from '../../catalogs/shared';
import { Decimal } from '../../documents/decimal';
import { isAnonymous } from '../../documents/predicates';
import { Rule } from '../rule';

const LIMIT = Decimal.from('700');

// resumen-diario-1.1.csv: over S/ 700.00 the Receipt must identify the customer.
export const customerIdentifiedAboveLimit = Rule.define({
  id: 'receipt/customer-identified-above-limit',
  appliesTo: [DocumentType.Receipt],
  sunatCode: '2514',
  effectiveFrom: '2018-01-01',
  why: 'A Receipt over S/ 700.00 must identify the customer.',
  fix: 'Pass the customer to sunat.receipt(...) when the total exceeds S/ 700.00.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/resumen-diario-1.1.csv',
  check(document) {
    if (!isAnonymous(document.customer)) return true;
    return document.totals.payable.compare(LIMIT) > 0 ? { path: 'customer' } : true;
  },
});
