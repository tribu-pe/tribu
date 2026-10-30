import { TribuError } from '../results/tribu-error';

/** Every catalog constant: frozen, with its catalog number, code and SUNAT's official name. */
export interface CatalogEntry {
  readonly catalog: string;
  readonly code: string;
  readonly name: string;
}

export interface EntryDefinition {
  readonly code?: string;
  readonly range?: readonly [string, string | null];
  readonly name: string;
  readonly [extra: string]: unknown;
}

type EntriesShapes = Record<string, EntryDefinition | Record<string, EntryDefinition>>;

export type BuiltEntry<D extends EntryDefinition, N extends string = string> = Readonly<
  { catalog: N; code: string; name: string } & Omit<D, 'code' | 'range'>
> & { readonly range?: readonly [string, string | null] };

type GroupEntries<G, N extends string> =
  G extends Record<string, EntryDefinition>
    ? { [K in keyof G]: BuiltEntry<G[K], N> }[keyof G]
    : never;

export type EntryOf<E extends EntriesShapes, N extends string = string> = {
  [K in keyof E]: E[K] extends EntryDefinition
    ? BuiltEntry<E[K], N>
    : GroupEntries<E[K] & Record<string, EntryDefinition>, N>;
}[keyof E];

export type BuiltCatalog<E extends EntriesShapes, N extends string = string> = {
  readonly [K in keyof E]: E[K] extends EntryDefinition
    ? BuiltEntry<E[K], N>
    : BuiltCatalog<E[K] & EntriesShapes, N>;
} & {
  readonly source: string;
  all(): readonly EntryOf<E, N>[];
  from(code: string): EntryOf<E, N>;
  classify(code: string): EntryOf<E, N>;
};

function invalid(why: string): TribuError {
  return new TribuError({
    kind: 'validation',
    issues: [
      { code: 'catalog', path: 'code', why, fix: 'Use a code from the catalog.', source: 'SUNAT' },
    ],
  });
}

function isEntry(
  value: EntryDefinition | Record<string, EntryDefinition>,
): value is EntryDefinition {
  return 'code' in value || 'range' in value;
}

/** Declares a catalog once: every constant is frozen and the source is stated in one place. */
function defineCatalog<const N extends string, const E extends EntriesShapes>(
  name: N,
  definition: { readonly source: string; readonly entries: E },
): BuiltCatalog<E, N> {
  const all: CatalogEntry[] = [];
  const byCode = new Map<string, CatalogEntry>();
  const ranged: { entry: CatalogEntry; range: readonly [string, string | null] }[] = [];

  const build = (spec: EntryDefinition): CatalogEntry => {
    const code = spec.code ?? spec.range?.[0];
    if (code === undefined) throw invalid(`An entry of catalog ${name} has no code.`);
    const { code: _code, range, name: entryName, ...extra } = spec;
    const base = { catalog: name, code, name: entryName, ...extra };
    const entry = Object.freeze(range === undefined ? base : { ...base, range });
    all.push(entry);
    if (range === undefined) byCode.set(code, entry);
    else ranged.push({ entry, range });
    return entry;
  };

  const built: Record<string, unknown> = { source: definition.source };
  for (const [key, value] of Object.entries(definition.entries)) {
    if (isEntry(value)) {
      built[key] = build(value);
    } else {
      const group: Record<string, CatalogEntry> = {};
      for (const [groupKey, entry] of Object.entries(value)) group[groupKey] = build(entry);
      built[key] = group;
    }
  }

  built['all'] = () => [...all];
  built['from'] = (code: string): CatalogEntry => {
    const entry = byCode.get(code);
    if (entry === undefined) throw invalid(`Catalog ${name} has no code ${code}.`);
    return entry;
  };
  built['classify'] = (code: string): CatalogEntry => {
    const exact = byCode.get(code);
    if (exact !== undefined) return exact;
    const value = Number(code);
    for (const { entry, range } of ranged) {
      const from = Number(range[0]);
      const to = range[1] === null ? Number.POSITIVE_INFINITY : Number(range[1]);
      if (Number.isFinite(value) && value >= from && value <= to) return entry;
    }
    throw invalid(`Catalog ${name} does not cover the code ${code}.`);
  };

  return built as BuiltCatalog<E, N>;
}

export const Catalog = { define: defineCatalog };
