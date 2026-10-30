/**
 * Tribu's own options. SUNAT values live in the catalogs; these are decisions Tribu makes
 * (ADR 0012, ADR 0018). They are constants so a free-text string can never reach SUNAT.
 */
export type RoundingValue = { readonly rounding: 'half-up' | 'half-even' };

export const Rounding: { readonly HalfUp: RoundingValue; readonly HalfEven: RoundingValue } = {
  HalfUp: { rounding: 'half-up' },
  HalfEven: { rounding: 'half-even' },
};

export type SignatureValue = { readonly algorithm: 'rsa-sha1' | 'rsa-sha256' };

export const Signature: {
  readonly RsaSha1: SignatureValue;
  readonly RsaSha256: SignatureValue;
} = {
  RsaSha1: { algorithm: 'rsa-sha1' },
  RsaSha256: { algorithm: 'rsa-sha256' },
};

export type RecoveryValue = { readonly strategy: 'confirm' | 'resend' };

export const Recovery: { readonly Confirm: RecoveryValue; readonly Resend: RecoveryValue } = {
  Confirm: { strategy: 'confirm' },
  Resend: { strategy: 'resend' },
};
