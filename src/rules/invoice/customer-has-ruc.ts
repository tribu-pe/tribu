import { DocumentType, Identity } from '../../catalogs/shared';
import { Rule } from '../rule';

// factura-2.0.csv: an Invoice needs an identified customer; a Receipt is the way to sell to a DNI.
export const customerHasRuc = Rule.define({
  id: 'invoice/customer-has-ruc',
  appliesTo: [DocumentType.Invoice],
  sunatCode: '2800',
  effectiveFrom: '2018-01-01',
  why: 'Only an Invoice gives IGV tax credit, so the buyer must identify with a RUC.',
  fix: 'Use sunat.receipt(...) for customers without RUC.',
  source: 'sources/sunat/reglas-validacion-2026-08-26/factura-2.0.csv',
  check(document) {
    return document.customer.identity.code === Identity.Ruc.code ? true : { path: 'customer' };
  },
});
