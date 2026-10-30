import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/** SUNAT receives one XML inside a ZIP with the same base name. */
export function zipDocument(fileName: string, xml: string): Uint8Array {
  return zipSync({ [`${fileName}.xml`]: strToU8(xml) });
}

/** The XML inside a ZIP. SUNAT's CDR ZIP also holds an empty `dummy/` folder, listed first. */
export function unzipXml(zip: Uint8Array): string {
  const files = unzipSync(zip);
  const entry = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('.xml'))?.[1];
  if (entry === undefined) throw new Error('The ZIP holds no XML file.');
  return strFromU8(entry);
}
