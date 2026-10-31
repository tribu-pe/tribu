import { describe, expect, test } from 'vitest';
import { escapeXml } from './escape';

describe('escapeXml', () => {
  test('escapes the five markup characters', () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;',
    );
  });

  test('drops characters XML 1.0 cannot hold', () => {
    expect(escapeXml('ab\u000Bc\u0000d\uD800e￾f')).toBe('abcdef');
  });

  test('keeps tab, line breaks, accents and astral characters', () => {
    expect(escapeXml('Ñandú\t\n\r😀')).toBe('Ñandú\t\n\r😀');
  });
});
