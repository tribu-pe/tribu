import type { Rule, RuleContext } from '../../src/rules/rule';
import { validate } from '../../src/rules/validate';

type Validated = Parameters<typeof validate>[0];

/** Runs one Rule through the real engine and returns every issue it raised. */
export function issuesOf<T extends Validated>(
  rule: Rule,
  document: T,
  context: Partial<RuleContext> = {},
) {
  const result = validate(document, [rule], { today: '2026-10-23', disable: [], ...context });
  return [...result.errors, ...result.warnings];
}

export function errorsOf<T extends Validated>(
  rule: Rule,
  document: T,
  context: Partial<RuleContext> = {},
) {
  return validate(document, [rule], { today: '2026-10-23', disable: [], ...context }).errors;
}

export function warningsOf<T extends Validated>(
  rule: Rule,
  document: T,
  context: Partial<RuleContext> = {},
) {
  return validate(document, [rule], { today: '2026-10-23', disable: [], ...context }).warnings;
}
