import { inspect } from 'node:util';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { generateTestCertificate, testCertificate } from '../test/support/certificate';
import { BETA_SOL, ISSUER } from '../test/support/client';
import { Igv } from './catalogs/index';
import tribu from './index';
import { Recovery, Rounding, Signature } from './options';
import { TribuError } from './results/tribu-error';
import { fakeSunat } from './testing/index';

const certificate = () => {
  const { pfx, passphrase } = testCertificate();
  return { pfx, passphrase };
};
const base = () => ({
  issuer: ISSUER,
  sol: BETA_SOL,
  certificate: certificate(),
  transport: fakeSunat(),
});

function configError(run: () => unknown): TribuError {
  try {
    run();
  } catch (error) {
    if (error instanceof TribuError && error.kind === 'config') return error;
    throw error;
  }
  throw new Error('expected a config error');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('tribu.create: Environment (ADR 0002)', () => {
  test('defaults to production', () => {
    vi.stubEnv('SUNAT_ENV', undefined);
    const sunat = tribu.create({ ...base(), sol: { user: 'FACTURADOR', password: 'secret' } });
    expect(sunat.env).toBe('production');
  });

  test('SUNAT_ENV=beta selects beta', () => {
    vi.stubEnv('SUNAT_ENV', 'beta');
    expect(tribu.create(base()).env).toBe('beta');
  });

  test('env in code wins over SUNAT_ENV', () => {
    vi.stubEnv('SUNAT_ENV', 'production');
    expect(tribu.create({ ...base(), env: 'beta' }).env).toBe('beta');
  });

  test('NODE_ENV is never read', () => {
    vi.stubEnv('SUNAT_ENV', undefined);
    vi.stubEnv('NODE_ENV', 'development');
    expect(tribu.create({ ...base(), sol: { user: 'FACTURADOR', password: 'secret' } }).env).toBe(
      'production',
    );
  });

  test('test credentials in production fail and explain how to use beta', () => {
    vi.stubEnv('SUNAT_ENV', undefined);
    const error = configError(() => tribu.create(base()));
    expect(error.message).toMatch(/MODDATOS/);
    expect(error.message).toMatch(/env: 'beta'/);
  });

  test('rejects an unknown environment', () => {
    // @ts-expect-error only 'beta' and 'production' exist
    configError(() => tribu.create({ ...base(), env: 'staging' }));
  });
});

describe('tribu.create: validated once, every problem at once', () => {
  test('collects all configuration problems in one error', () => {
    const error = configError(() =>
      tribu.create({
        ...base(),
        env: 'beta',
        issuer: { ...ISSUER, ruc: '20000000002' },
        series: { receipt: 'X001' },
      }),
    );
    expect(error.issues.map((issue) => issue.path)).toEqual(['issuer.ruc', 'series.receipt']);
  });

  test('series default by convention', () => {
    expect(tribu.create({ ...base(), env: 'beta' }).config.series).toEqual({
      invoice: 'F001',
      receipt: 'B001',
      creditNote: { invoice: 'FC01', receipt: 'BC01' },
      debitNote: { invoice: 'FD01', receipt: 'BD01' },
    });
  });

  test('a note series must start with the letter of the document it modifies', () => {
    const error = configError(() =>
      tribu.create({ ...base(), env: 'beta', series: { creditNote: { invoice: 'BC01' } } }),
    );
    expect(error.issues[0]?.path).toBe('series.creditNote.invoice');
  });

  test('the configuration is frozen', () => {
    const sunat = tribu.create({ ...base(), env: 'beta' });
    expect(Object.isFrozen(sunat.config)).toBe(true);
  });

  test('refuses to run in a browser: it holds the Certificate and SOL password (ADR 0009)', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
    expect(configError(() => tribu.create({ ...base(), env: 'beta' })).message).toMatch(/server/);
  });
});

describe('tribu.create: secrets', () => {
  test('reads missing secrets from SUNAT_* variables', () => {
    vi.stubEnv('SUNAT_SOL_USER', 'MODDATOS');
    vi.stubEnv('SUNAT_SOL_PASSWORD', 'MODDATOS');
    const sunat = tribu.create({
      env: 'beta',
      issuer: ISSUER,
      certificate: certificate(),
      transport: fakeSunat(),
    });
    expect(sunat.env).toBe('beta');
  });

  test('names the variable that is missing', () => {
    vi.stubEnv('SUNAT_SOL_USER', 'MODDATOS');
    vi.stubEnv('SUNAT_SOL_PASSWORD', undefined);
    const error = configError(() =>
      tribu.create({
        env: 'beta',
        issuer: ISSUER,
        certificate: certificate(),
        transport: fakeSunat(),
      }),
    );
    expect(error.message).toContain('SUNAT_SOL_PASSWORD');
  });

  test('the SOL user goes without the RUC: Tribu concatenates it', () => {
    const error = configError(() =>
      tribu.create({
        ...base(),
        env: 'beta',
        sol: { user: '20000000001MODDATOS', password: 'MODDATOS' },
      }),
    );
    expect(error.issues[0]?.path).toBe('sol.user');
    expect(error.issues[0]?.fix).toMatch(/without the RUC/);
  });

  test('never shows the password, the passphrase or the certificate', () => {
    const sunat = tribu.create({
      ...base(),
      env: 'beta',
      sol: { user: 'MODDATOS', password: 'pw-not-to-leak' },
    });
    const printed = `${inspect(sunat, { depth: 10 })} ${JSON.stringify(sunat.config)}`;
    expect(printed).not.toContain('pw-not-to-leak');
    expect(printed).not.toContain(testCertificate().passphrase);
    expect(printed).toContain('[REDACTED]');
  });

  test('never writes to the console', () => {
    const log = vi.spyOn(console, 'log');
    const warn = vi.spyOn(console, 'warn');
    tribu.create({ ...base(), env: 'beta' });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('tribu.create: Certificate', () => {
  test('a wrong passphrase fails at creation, not at the first invoice', () => {
    const { pfx } = testCertificate();
    const error = configError(() =>
      tribu.create({ ...base(), env: 'beta', certificate: { pfx, passphrase: 'wrong' } }),
    );
    expect(error.issues[0]?.path).toBe('certificate.passphrase');
  });

  test('an expired certificate fails', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T15:00:00Z'));
    const expired = generateTestCertificate({ notBefore: '2024-01-01', notAfter: '2025-12-31' });
    const error = configError(() =>
      tribu.create({
        ...base(),
        env: 'beta',
        certificate: { pfx: expired.pfx, passphrase: expired.passphrase },
      }),
    );
    expect(error.issues[0]?.path).toBe('certificate');
  });

  test('a certificate expiring within 30 days is a warning, not an error', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T15:00:00Z'));
    const soon = generateTestCertificate({ notBefore: '2025-11-05', notAfter: '2026-11-05' });
    const sunat = tribu.create({
      ...base(),
      env: 'beta',
      certificate: { pfx: soon.pfx, passphrase: soon.passphrase },
    });
    expect(sunat.warnings).toEqual([expect.objectContaining({ path: 'certificate' })]);
    expect(sunat.warnings[0]?.why).toMatch(/2026-11-05/);
  });
});

describe('tribu.create: options take constants only (ADRs 0012, 0018)', () => {
  test('accepts Igv, Rounding, Signature and Recovery constants', () => {
    const sunat = tribu.create({
      ...base(),
      env: 'beta',
      issuer: { ...ISSUER, igv: Igv.Hospitality },
      rounding: Rounding.HalfUp,
      signature: Signature.RsaSha1,
      recovery: Recovery.Confirm,
    });
    expect(sunat.config.issuer.igv).toBe(Igv.Hospitality);
  });

  test('rejects a free-text IGV regime', () => {
    configError(() =>
      // @ts-expect-error a string is not an IGV Regime
      tribu.create({ ...base(), env: 'beta', issuer: { ...ISSUER, igv: 'restaurant-hotel-mype' } }),
    );
  });

  test('has no way to set a percentage', () => {
    // @ts-expect-error there is no igvRate option
    configError(() => tribu.create({ ...base(), env: 'beta', igvRate: 10.5 }));
  });

  test('rejects a free-text rounding or signature', () => {
    // @ts-expect-error a string is not a Rounding constant
    configError(() => tribu.create({ ...base(), env: 'beta', rounding: 'half-even' }));
    // @ts-expect-error a string is not a Signature constant
    configError(() => tribu.create({ ...base(), env: 'beta', signature: 'rsa-md5' }));
  });

  test('resilience defaults: 30 s timeout, 3 attempts from 1 s, conservative recovery (ADR 0015)', () => {
    const { config } = tribu.create({ ...base(), env: 'beta' });
    expect(config.timeout).toBe(30_000);
    expect(config.retry).toEqual({ attempts: 3, delay: 1_000 });
    expect(config.recovery).toEqual({
      invoice: Recovery.Confirm,
      receipt: Recovery.Confirm,
      creditNote: Recovery.Confirm,
      debitNote: Recovery.Confirm,
    });
  });

  test('recovery can be set per document type', () => {
    const { config } = tribu.create({
      ...base(),
      env: 'beta',
      recovery: { receipt: Recovery.Resend },
    });
    expect(config.recovery.receipt).toBe(Recovery.Resend);
    expect(config.recovery.invoice).toBe(Recovery.Confirm);
  });
});
