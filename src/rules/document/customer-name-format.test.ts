import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { customerNameFormat } from './customer-name-format';

// factura-2.0.csv: RegistrationName, 3 to 1500 characters; spaces allowed, no other whitespace
// (line breaks, tabs). ERROR 2022.
describe('document/customer-name-format (ERR 2022)', () => {
  test('accepts a name with spaces and symbols', () => {
    expect(
      errorsOf(
        customerNameFormat,
        anInvoice({ customer: { ruc: '20123456786', name: 'A & B S.A.C.' } }),
      ),
    ).toEqual([]);
  });

  test.each([
    ['AB', 'shorter than 3 characters'],
    ['CLIENTE\nSAC', 'a line break'],
    ['CLIENTE\tSAC', 'a tab'],
    ['X'.repeat(1501), 'longer than 1500 characters'],
  ])('rejects %j (%s)', (name) => {
    const [issue] = errorsOf(
      customerNameFormat,
      anInvoice({ customer: { ruc: '20123456786', name } }),
    );
    expect(issue).toMatchObject({ code: '2022', path: 'customer.name' });
  });
});
