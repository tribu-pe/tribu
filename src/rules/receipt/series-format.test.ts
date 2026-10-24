import { describe, expect, test } from 'vitest';
import { aReceipt } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { seriesFormat } from './series-format';

// boleta-2.0.csv: format [B][A-Z0-9]{3}-[0-9]{1,8}
describe('receipt/series-format (ERR 1001)', () => {
  test('accepts B followed by 3 uppercase alphanumerics', () => {
    expect(errorsOf(seriesFormat, aReceipt({ series: 'B002' }))).toEqual([]);
  });

  test.each(['F001', 'X001', 'b001'])('rejects the series %s', (series) => {
    expect(errorsOf(seriesFormat, aReceipt({ series }))[0]).toMatchObject({
      code: '1001',
      path: 'series',
    });
  });
});
