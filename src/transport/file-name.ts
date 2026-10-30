import type { Document } from '../documents/document';

/** Annex VI of R.S. 114-2019: RUC-TYPE-SERIES-NUMBER. */
export function documentFileName(
  ruc: string,
  document: Document & { readonly number: number },
): string {
  return `${ruc}-${document.type.code}-${document.series}-${document.number}`;
}

/** Annex VI of R.S. 114-2019: RUC-RC-YYYYMMDD-n. */
export function dailySummaryFileName(ruc: string, date: string, number: number): string {
  return `${ruc}-RC-${date.replaceAll('-', '')}-${number}`;
}

/** Annex VI of R.S. 114-2019: RUC-RA-YYYYMMDD-n. */
export function voidedDocumentsFileName(ruc: string, date: string, number: number): string {
  return `${ruc}-RA-${date.replaceAll('-', '')}-${number}`;
}
