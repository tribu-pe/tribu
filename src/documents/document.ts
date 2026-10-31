import type { CatalogEntry } from '../catalogs/catalog';
import type { Decimal } from './decimal';
import type { Dni } from './dni';
import type { Ruc } from './ruc';

export interface IdentifiedCustomer {
  readonly identity: CatalogEntry;
  readonly number: Ruc | Dni | string;
  readonly name: string;
}

/** A Receipt may leave the customer unidentified; it is coded in Milestone 0 (question 2). */
export interface AnonymousCustomer {
  readonly anonymous: true;
}

export interface TaxScheme {
  readonly code: string;
  readonly name: string;
  readonly international: string;
}

export type Source = 'default' | 'issuer' | 'item';

export interface Item {
  readonly description: string;
  readonly quantity: Decimal;
  readonly unit: CatalogEntry;
  readonly affectation: CatalogEntry;
  readonly classification?: string;
  readonly unitValue: Decimal;
  readonly unitPrice: Decimal;
  readonly value: Decimal;
  readonly igv: Decimal;
  readonly total: Decimal;
  readonly taxScheme: TaxScheme;
  readonly sources: { readonly unit: Source; readonly affectation: Source };
}

export interface Totals {
  readonly taxed: Decimal;
  readonly exempt: Decimal;
  readonly unaffected: Decimal;
  readonly igv: Decimal;
  readonly value: Decimal;
  readonly payable: Decimal;
}

export interface Installment {
  readonly amount: Decimal;
  readonly due: string;
}

export type Payment =
  | { readonly terms: 'cash' }
  | {
      readonly terms: 'credit';
      readonly pending: Decimal;
      readonly installments: readonly Installment[];
    };

export interface Issuer {
  readonly ruc: Ruc;
  readonly name: string;
  readonly ubigeo: string;
}

export interface DocumentBase {
  readonly type: CatalogEntry;
  readonly number?: number;
  readonly series: string;
  readonly issueDate: string;
  readonly currency: CatalogEntry;
  readonly customer: IdentifiedCustomer;
  readonly items: readonly [Item, ...Item[]];
  readonly totals: Totals;
  readonly payment: Payment;
  readonly igvRate: Decimal;
  readonly issuer: Issuer;
}

/** The detracción an Invoice states (docs/research/detracciones-2026-10.md § 4; ADR 0020). */
export interface Detraccion {
  /** The catalog 54 good or service. */
  readonly code: CatalogEntry;
  readonly rate: Decimal;
  /** Always in soles (ERR 3208). */
  readonly amount: Decimal;
  /** The Issuer's account at Banco de la Nación. */
  readonly account: string;
}

export interface Invoice extends DocumentBase {
  readonly detraccion?: Detraccion;
}

export interface Receipt extends DocumentBase {}

export interface CreditNote extends DocumentBase {
  /** Series-Number of the document it modifies, as given; the Rules check its shape. */
  readonly modifies: string;
  readonly reason: CatalogEntry;
}

export interface DebitNote extends DocumentBase {
  readonly modifies: string;
  readonly reason: CatalogEntry;
}

export type Document = Invoice | Receipt | CreditNote | DebitNote;
