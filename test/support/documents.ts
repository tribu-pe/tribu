import { Reason as CreditReason } from '../../src/catalogs/documents/credit-note';
import { Affectation, DocumentType, Igv, Unit } from '../../src/catalogs/index';
import { type CalculationSettings, calculate } from '../../src/documents/calculate';
import { Ruc } from '../../src/documents/ruc';
import { Rounding } from '../../src/options';
import { Status } from '../../src/results/status';
import { CUSTOMER, ISSUER } from './client';

/** What `calculate` needs from the client configuration, with v0.1 defaults. */
export function settings(overrides: Partial<CalculationSettings> = {}): CalculationSettings {
  return {
    issuer: {
      ruc: Ruc.from(ISSUER.ruc),
      name: ISSUER.name,
      ubigeo: ISSUER.ubigeo,
      igv: Igv.General,
    },
    defaults: { unit: Unit.Goods, affectation: Affectation.Taxed },
    rounding: Rounding.HalfUp,
    today: '2026-10-23',
    ...overrides,
  };
}

type InvoiceInput = Parameters<typeof calculate>[1];

/** A calculated invoice (no Number yet), for Rule and XML tests. */
export function anInvoice(
  input: Partial<InvoiceInput> = {},
  overrides: Partial<CalculationSettings> = {},
) {
  return calculate(
    DocumentType.Invoice,
    {
      customer: CUSTOMER,
      items: [{ description: 'Teclado', quantity: 2, price: 118 }],
      ...input,
    } as InvoiceInput,
    settings(overrides),
  );
}

type NoteInput = Parameters<typeof calculate>[1];

export function aCreditNote(
  input: Partial<NoteInput> = {},
  overrides: Partial<CalculationSettings> = {},
) {
  return calculate(
    DocumentType.CreditNote,
    {
      modifies: 'F001-123',
      reason: CreditReason.Item.Return,
      customer: CUSTOMER,
      items: [{ description: 'Teclado', quantity: 1, price: 118 }],
      ...input,
    } as NoteInput,
    settings(overrides),
  );
}

/**
 * The Record of an earlier document, as the caller would have saved it (ADR 0008).
 * Only the fields Rules read: id, status and the calculated document with its Number.
 */
export function aRecordOf<T extends { series: string }>(
  document: T,
  number: number,
  status: (typeof Status)[keyof typeof Status] = Status.Accepted,
) {
  return { id: `${document.series}-${number}`, status, document: { ...document, number } };
}

export function aReceipt(
  input: Partial<InvoiceInput> = {},
  overrides: Partial<CalculationSettings> = {},
) {
  return calculate(
    DocumentType.Receipt,
    {
      customer: { dni: '12345678', name: 'Juan Pérez' },
      items: [{ description: 'Mouse', quantity: 1, price: 50 }],
      ...input,
    } as InvoiceInput,
    settings(overrides),
  );
}
