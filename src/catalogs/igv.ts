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

function rateOn(regime: IgvRegime, date: string): Decimal {
  if (regime.code === regimes.General.code) return Decimal.from('18');
  const year = Number(date.slice(0, 4));
  if (year <= 2026) return Decimal.from('10.5');
  if (year === 2027) return Decimal.from('15');
  throw new TribuError({
    kind: 'validation',
    issues: [
      {
        code: '3462',
        path: 'issueDate',
        why: `The hospitality IGV rate has no value in force on ${date}.`,
        fix: 'Issue the document while the regime applies, or use the general regime.',
        source: 'Ley 31556 (as amended by Ley 32219)',
      },
    ],
  });
}

/** The IGV regime an issuer declares; the rate follows the issue date (ADR 0012). */
export const Igv = { ...regimes, rateOn };
