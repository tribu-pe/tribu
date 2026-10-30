import type { CatalogEntry } from '../catalogs/catalog';
import { ReturnCode } from '../catalogs/return-code';
import type { Document } from '../documents/document';
import { TribuError } from '../results/tribu-error';

export interface RuleContext {
  readonly today: string;
  readonly disable: readonly string[];
  readonly channel?: 'individual' | 'summary' | 'voiding';
  readonly affected?: {
    readonly id: string;
    readonly status?: unknown;
    readonly document?: Document;
  };
}

export interface RuleDefinition {
  readonly id: string;
  readonly appliesTo: readonly CatalogEntry[];
  readonly sunatCode: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly why: string;
  readonly fix: string;
  readonly source: string;
  check(document: Document, context: RuleContext): boolean | { readonly path: string };
}

export type Rule = RuleDefinition;

const ALLOWED = new Set([
  'id',
  'appliesTo',
  'sunatCode',
  'effectiveFrom',
  'effectiveTo',
  'why',
  'fix',
  'source',
  'check',
]);

const REQUIRED = ['id', 'sunatCode', 'effectiveFrom', 'why', 'fix', 'source'] as const;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function config(why: string): TribuError {
  return new TribuError({
    kind: 'config',
    issues: [
      {
        code: 'rule',
        path: 'rule',
        why,
        fix: 'Declare every Rule with its id, appliesTo, sunatCode, effectiveFrom, why, fix, source and check.',
        source: 'docs/conventions.md § Rules',
      },
    ],
  });
}

function define(definition: RuleDefinition): Rule {
  for (const key of Object.keys(definition)) {
    if (!ALLOWED.has(key)) throw config(`A Rule has no field ${key}.`);
  }
  for (const field of REQUIRED) {
    const value = definition[field];
    if (typeof value !== 'string' || value.length === 0) {
      throw config(`A Rule needs ${field}.`);
    }
  }
  if (!ID.test(definition.id)) {
    throw config(`The Rule id ${definition.id} is not <document>/<what-must-hold> in kebab-case.`);
  }
  if (!Array.isArray(definition.appliesTo) || definition.appliesTo.length === 0) {
    throw config('A Rule needs appliesTo.');
  }
  if (typeof definition.check !== 'function') throw config('A Rule needs check.');
  ReturnCode.from(definition.sunatCode);
  if (definition.effectiveTo !== undefined && definition.effectiveTo < definition.effectiveFrom) {
    throw config('effectiveTo cannot be before effectiveFrom.');
  }
  return Object.freeze({ ...definition });
}

/** Declares one Rule. Its id is its path: <document>/<what-must-hold>. */
export const Rule = { define };
