import type { Document } from './document';

function identityNumber(value: { readonly value: string } | string): string {
  return typeof value === 'string' ? value : value.value;
}

/**
 * The QR text of R.S. 357-2015 Annex C:
 * RUC | TYPE | SERIES | NUMBER | TOTAL IGV | TOTAL | ISSUE DATE | CUSTOMER TYPE | CUSTOMER NUMBER |
 * The signature hash is not part of it.
 */
export function qrText(document: Document): string {
  const customer = document.customer as {
    readonly anonymous?: boolean;
    readonly identity?: { readonly code: string };
    readonly number?: { readonly value: string } | string;
  };
  const anonymous = customer.anonymous === true;
  const identity = anonymous ? '-' : (customer.identity?.code ?? '-');
  const number = anonymous || customer.number === undefined ? '-' : identityNumber(customer.number);
  return `${[
    document.issuer.ruc.value,
    document.type.code,
    document.series,
    document.number === undefined ? '' : String(document.number),
    document.totals.igv.toFixed(2),
    document.totals.payable.toFixed(2),
    document.issueDate,
    identity,
    number,
  ].join('|')}|`;
}
