import { describe, expect, test } from 'vitest';
import { anInvoice } from '../../../test/support/documents';
import { errorsOf } from '../../../test/support/rules';
import { customerHasRuc } from './customer-has-ruc';

// factura-2.0.csv: "Si no es uno de los cuatro casos anteriores, el valor del Tag UBL es diferente de '6'"
describe('invoice/customer-has-ruc (ERR 2800)', () => {
  test('accepts an invoice whose customer has a RUC', () => {
    expect(errorsOf(customerHasRuc, anInvoice())).toEqual([]);
  });

  test('rejects an invoice whose customer has a DNI instead of a RUC', () => {
    const invoice = anInvoice({ customer: { dni: '12345678', name: 'Juan Pérez' } });
    const [issue] = errorsOf(customerHasRuc, invoice);
    expect(issue).toMatchObject({ code: '2800', path: 'customer' });
    expect(issue?.fix).toMatch(/sunat\.receipt/);
  });
});
