import { ReturnCode } from '../catalogs/return-code';
import type { Document } from '../documents/document';
import type { Issue } from '../results/tribu-error';
import type { Rule, RuleContext } from './rule';

export interface RuleIssue extends Issue {
  readonly rule: string;
}

export interface ValidationResult {
  readonly errors: RuleIssue[];
  readonly warnings: RuleIssue[];
}

/** Applies every Rule in force on the issue date; severity comes from the SUNAT code (ADR 0011). */
export function validate(
  document: Document,
  rules: readonly Rule[],
  options: RuleContext,
): ValidationResult {
  const errors: RuleIssue[] = [];
  const warnings: RuleIssue[] = [];

  for (const rule of rules) {
    if (options.disable.includes(rule.id)) continue;
    if (!rule.appliesTo.some((entry) => entry.code === document.type.code)) continue;
    if (rule.effectiveFrom > document.issueDate) continue;
    if (rule.effectiveTo !== undefined && rule.effectiveTo < document.issueDate) continue;

    const result = rule.check(document, options);
    if (typeof result === 'boolean') continue;

    const issue: RuleIssue = {
      code: rule.sunatCode,
      path: result.path,
      why: rule.why,
      fix: rule.fix,
      source: rule.source,
      rule: rule.id,
    };
    const severity = ReturnCode.from(rule.sunatCode).severityOn(document.issueDate);
    if (severity === 'observation') warnings.push(issue);
    else errors.push(issue);
  }

  return { errors, warnings };
}
