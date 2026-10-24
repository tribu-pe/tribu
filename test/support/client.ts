import tribu from '../../src/index';
import { type FakeSunatOptions, fakeSunat } from '../../src/testing/index';
import { testCertificate } from './certificate';

/** SUNAT's public beta credentials (orientacion.sunat.gob.pe/12-pautas-servicio-beta). */
export const BETA_SOL = { user: 'MODDATOS', password: 'MODDATOS' } as const;

export const ISSUER = { ruc: '20000000001', name: 'EMPRESA DE PRUEBA SAC', ubigeo: '150101' };

/** Valid RUC (check digit 6). Note: '20123456789', used in early drafts, fails the check digit. */
export const CUSTOMER = { ruc: '20123456786', name: 'CLIENTE SAC' };

type CreateOptions = Parameters<typeof tribu.create>[0];

/** A client against an in-memory SUNAT. Beta by default; pass `env` to change it. */
export function createTestClient(
  options: Partial<CreateOptions> = {},
  fakeOptions: FakeSunatOptions = {},
) {
  const fake = fakeSunat(fakeOptions);
  const { pfx, passphrase } = testCertificate();
  const sunat = tribu.create({
    env: 'beta',
    issuer: ISSUER,
    sol: BETA_SOL,
    certificate: { pfx, passphrase },
    transport: fake,
    ...options,
  } as CreateOptions);
  return { sunat, fake };
}

/** Production needs non-test credentials (ADR 0002). */
export function createProductionClient(
  options: Partial<CreateOptions> = {},
  fakeOptions: FakeSunatOptions = {},
) {
  return createTestClient(
    { env: 'production', sol: { user: 'FACTURADOR', password: 'secret-password' }, ...options },
    fakeOptions,
  );
}
