import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { seriesFormat } from './series-format';

// factura-2.0.csv: format [F][A-Z0-9]{3}-[0-9]{1,8}
describe('invoice/series-format (ERR 1001)', () => {
  test('accepts F followed by 3 uppercase alphanumerics', () => {
    expect(errorsOf(seriesFormat, anInvoice({ series: 'F0A1' }))).toEqual([]);
  });

  test.each(['B001', 'F01', 'f001', 'F00-'])('rejects the series %s', (series) => {
    expect(errorsOf(seriesFormat, anInvoice({ series }))[0]).toMatchObject({
      code: '1001',
      path: 'series',
    });
  });
});
