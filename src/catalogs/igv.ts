import { Decimal } from '../documents/decimal';
import { TribuError } from '../results/tribu-error';
import { Catalog } from './catalog';

const regimes = Catalog.define('igv', {
  source: 'Ley 32387; Ley 31556 as amended by Ley 32219',
  entries: {
    General: { code: 'general', name: 'Régimen general', source: 'Ley 32387' },
    Hospitality: {
      code: 'hospitality',
      name: 'Restaurantes y hoteles',
      source: 'Ley 31556 (as amended by Ley 32219)',
    },
  },
});

export type IgvRegime = (typeof regimes)['General'] | (typeof regimes)['Hospitality'];

/** A rate in force from `from` to `to` (inclusive, YYYY-MM-DD); no `to` means it still applies. */
interface DatedRate {
  readonly from: string;
  readonly to?: string;
  readonly rate: string;
}

/**
 * Each regime's rates by issue date: a new law is one more line here (ADR 0012).
 * docs/research/sunat-facts-2026-10.md § IGV rate. The start of Ley 31556 is not verified
 * (unconfirmed), so the first hospitality line reaches back to the earliest possible date.
 */
const RATES: Readonly<Record<string, readonly DatedRate[]>> = {
  [regimes.General.code]: [{ from: '0000-01-01', rate: '18' }],
  [regimes.Hospitality.code]: [
    { from: '0000-01-01', to: '2026-12-31', rate: '10.5' },
    { from: '2027-01-01', to: '2027-12-31', rate: '15' },
  ],
};

function rateOn(regime: IgvRegime, date: string): Decimal {
  const line = (RATES[regime.code] ?? []).find(
    (candidate) => candidate.from <= date && (candidate.to === undefined || date <= candidate.to),
  );
  if (line !== undefined) return Decimal.from(line.rate);
  throw new TribuError({
    kind: 'validation',
    issues: [
      {
        code: '3462',
        path: 'issueDate',
        why: `The ${regime.name} IGV rate has no value in force on ${date}.`,
        fix: 'Issue the document while the regime applies, or use the general regime.',
        source: regime.source,
      },
    ],
  });
}

/** The IGV regime an issuer declares; the rate follows the issue date (ADR 0012). */
export const Igv = { ...regimes, rateOn };
