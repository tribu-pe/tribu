import { DOMParser } from '@xmldom/xmldom';
import { ResponseCode } from '../catalogs/shared';
import type { Cdr, Observation } from '../results/record';

function textOf(
  root: { getElementsByTagName(name: string): ArrayLike<{ textContent: string | null }> },
  name: string,
): string {
  return root.getElementsByTagName(name)[0]?.textContent?.trim() ?? '';
}

function observationsOf(root: {
  getElementsByTagName(name: string): ArrayLike<{ textContent: string | null }>;
}): Observation[] {
  const notes = root.getElementsByTagName('cbc:Note');
  const observations: Observation[] = [];
  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]?.textContent?.trim() ?? '';
    const separator = note.indexOf(' - ');
    if (separator === -1) continue;
    observations.push({
      code: note.slice(0, separator).trim(),
      message: note.slice(separator + 3).trim(),
    });
  }
  return observations;
}

/** SUNAT's ApplicationResponse (CDR) → data. Malformed XML is not a CDR. */
export function readCdr(xml: string): Cdr {
  const errors: string[] = [];
  const parsed = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') errors.push(message);
    },
  }).parseFromString(xml, 'text/xml');
  if (errors.length > 0) throw new Error(`Malformed CDR: ${errors.join('; ')}`);

  const root = parsed.documentElement;
  if (root === null || root.localName !== 'ApplicationResponse') {
    throw new Error('Not a SUNAT ApplicationResponse (CDR).');
  }
  const response = root.getElementsByTagName('cac:Response')[0];
  if (response === undefined) throw new Error('The CDR has no cac:Response.');

  const code = textOf(response, 'cbc:ResponseCode');
  return {
    documentId: textOf(response, 'cbc:ReferenceID'),
    code,
    response: ResponseCode.classify(code),
    description: textOf(response, 'cbc:Description'),
    observations: observationsOf(root),
    xml,
  };
}
