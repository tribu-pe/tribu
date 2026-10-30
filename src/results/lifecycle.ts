import type { CatalogEntry } from '../catalogs/catalog';
import { TribuError } from './tribu-error';

/** One state of a Lifecycle: its code, the SUNAT answers that produce it, and why. */
export interface LifecycleState {
  readonly catalog: string;
  readonly code: string;
  readonly from: readonly CatalogEntry[];
  readonly why: string;
}

interface StateDefinition {
  readonly from: readonly CatalogEntry[];
  readonly why: string;
}

type BuiltStates<D extends Record<string, StateDefinition>> = {
  readonly [K in keyof D]: Readonly<{
    catalog: string;
    code: string;
    from: D[K]['from'];
    why: D[K]['why'];
  }>;
} & {
  readonly kind: 'lifecycle';
  all(): readonly LifecycleState[];
};

function config(why: string): TribuError {
  return new TribuError({
    kind: 'config',
    issues: [
      {
        code: 'lifecycle',
        path: 'lifecycle',
        why,
        fix: 'Declare every state with why and with Catalog entries in from.',
        source: 'ADR 0014',
      },
    ],
  });
}

function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function defineLifecycle<const D extends Record<string, StateDefinition>>(
  name: string,
  definition: D,
): BuiltStates<D> {
  const states: LifecycleState[] = [];
  const built: Record<string, unknown> = { kind: 'lifecycle' };
  for (const [key, state] of Object.entries(definition)) {
    if (typeof state.why !== 'string' || state.why.length === 0) {
      throw config(`The state ${key} has no why.`);
    }
    if (!Array.isArray(state.from)) throw config(`The state ${key} has no from.`);
    for (const source of state.from) {
      if (
        typeof source !== 'object' ||
        source === null ||
        !('catalog' in source) ||
        !('code' in source)
      ) {
        throw config(`The state ${key} takes only Catalog entries in from.`);
      }
    }
    const entry = Object.freeze({
      catalog: name,
      code: kebab(key),
      from: [...state.from],
      why: state.why,
    });
    built[key] = entry;
    states.push(entry);
  }
  built['all'] = () => [...states];
  return built as BuiltStates<D>;
}

export const Lifecycle = { define: defineLifecycle };
