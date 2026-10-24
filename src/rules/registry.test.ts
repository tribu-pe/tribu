import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { defaultRules } from './registry';

const here = fileURLToPath(new URL('.', import.meta.url));

// docs/conventions.md § Rules: "A Rule without a test fails CI."
describe('the default Rule set', () => {
  test('is not empty', () => {
    expect(defaultRules.length).toBeGreaterThan(0);
  });

  test.each(defaultRules.map((rule) => [rule.id]))('%s has a test file next to it', (id) => {
    expect(existsSync(`${here}${id}.test.ts`)).toBe(true);
  });

  test.each(defaultRules.map((rule) => [rule.id]))('%s lives at src/rules/<id>.ts', (id) => {
    expect(existsSync(`${here}${id}.ts`)).toBe(true);
  });

  test('ids are unique', () => {
    const ids = defaultRules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every Rule has why, fix and source', () => {
    for (const rule of defaultRules) {
      expect(rule.why.length, rule.id).toBeGreaterThan(0);
      expect(rule.fix.length, rule.id).toBeGreaterThan(0);
      expect(rule.source.length, rule.id).toBeGreaterThan(0);
    }
  });
});
