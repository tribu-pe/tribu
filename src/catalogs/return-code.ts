import { TribuError } from '../results/tribu-error';
import { returnCodeChanges, returnCodes, type Severity } from './data/return-codes';

/** One SUNAT return code, with the severity in force on a given date (ADR 0011). */
export interface ReturnCodeEntry {
  readonly catalog: 'return-code';
  readonly code: string;
  readonly name: string;
  severityOn(date: string): Severity;
}

const timeline = new Map<string, readonly (readonly [string, Severity])[]>(returnCodeChanges);
const entries: ReturnCodeEntry[] = [];
const byCode = new Map<string, ReturnCodeEntry>();

for (const [code, name, base] of returnCodes) {
  const changes = timeline.get(code) ?? [];
  const entry: ReturnCodeEntry = Object.freeze({
    catalog: 'return-code' as const,
    code,
    name,
    severityOn(date: string): Severity {
      let severity = base;
      for (const [from, value] of changes) if (from <= date) severity = value;
      return severity;
    },
  });
  byCode.set(code, entry);
  entries.push(entry);
}

/** All 2,077 return codes (códigos de retorno) from SUNAT's validation workbook. */
export const ReturnCode = {
  source: 'sources/sunat/reglas-validacion-2026-08-26/codigos-retorno.csv',
  all(): readonly ReturnCodeEntry[] {
    return entries;
  },
  from(code: string): ReturnCodeEntry {
    const entry = byCode.get(code);
    if (entry === undefined) {
      throw new TribuError({
        kind: 'validation',
        issues: [
          {
            code,
            path: 'sunatCode',
            why: `SUNAT does not define the return code ${code}.`,
            fix: 'Use a code from sources/sunat/reglas-validacion-2026-08-26/codigos-retorno.csv.',
            source: 'sources/sunat/reglas-validacion-2026-08-26/codigos-retorno.csv',
          },
        ],
      });
    }
    return entry;
  },
};
