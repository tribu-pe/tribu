import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// factura-2.0.csv: series and number as [F][A-Z0-9]{3}-[0-9]{1,8}.
export const seriesFormat = Rule.define({
  id: 'invoice/series-format',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '1001',
  effectiveFrom: '2018-01-01',
  why: 'An Invoice series is an F followed by three uppercase alphanumerics.',
  fix: 'Use a series such as F001 or F0A1.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document) {
    return /^F[A-Z0-9]{3}$/.test(document.series) ? true : { path: 'series' };
  },
});
