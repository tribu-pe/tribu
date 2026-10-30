import { DocumentType } from '../../catalogs/shared';
import { Rule } from '../rule';

// boleta-2.0.csv: series and number as [B][A-Z0-9]{3}-[0-9]{1,8}.
export const seriesFormat = Rule.define({
  id: 'receipt/series-format',
  appliesTo: [DocumentType.Receipt],
  sunatCode: '1001',
  effectiveFrom: '2018-01-01',
  why: 'A Receipt series is a B followed by three uppercase alphanumerics.',
  fix: 'Use a series such as B001 or B002.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/boleta-2.0.csv',
  check(document) {
    return /^B[A-Z0-9]{3}$/.test(document.series) ? true : { path: 'series' };
  },
});
