import { DocumentType } from '../../catalogs/shared';
import { isAnonymous } from '../../documents/predicates';
import { Rule } from '../rule';

// factura-2.0.csv: RegistrationName, 3 to 1500 characters; spaces allowed, no other whitespace.
export const customerNameFormat = Rule.define({
  id: 'document/customer-name-format',
  appliesTo: [
    DocumentType.Invoice,
    DocumentType.Receipt,
    DocumentType.CreditNote,
    DocumentType.DebitNote,
  ],
  sunatCode: '2022',
  effectiveFrom: '2018-01-01',
  why: 'RegistrationName takes 3 to 1500 characters; line breaks and tabs are not allowed.',
  fix: 'Pass the customer name on one line, between 3 and 1500 characters.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document) {
    if (isAnonymous(document.customer)) return true;
    const { name } = document.customer;
    if (name.length < 3 || name.length > 1500 || /[\n\r\t]/.test(name)) {
      return { path: 'customer.name' };
    }
    return true;
  },
});
