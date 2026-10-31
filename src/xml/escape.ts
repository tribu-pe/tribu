/**
 * Text → XML 1.0 text. Besides the five markup characters it drops what XML cannot hold at all
 * (control characters such as U+000B, lone surrogates, U+FFFE and U+FFFF): SUNAT cannot read a
 * file that has them, and a pasted customer name or description can carry them.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
