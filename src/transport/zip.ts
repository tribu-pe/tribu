import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/** SUNAT receives one XML inside a ZIP with the same base name. */
export function zipDocument(fileName: string, xml: string): Uint8Array {
  return zipSync({ [`${fileName}.xml`]: strToU8(xml) });
}

export function unzipXml(zip: Uint8Array): string {
  const files = unzipSync(zip);
  const entry = Object.values(files)[0];
  if (entry === undefined) throw new Error('The ZIP holds no file.');
  return strFromU8(entry);
}
