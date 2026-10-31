import { describe, expect, test } from 'vitest';
import { generateTestCertificate, testCertificate } from '../../test/support/certificate';
import { TribuError } from '../results/tribu-error';
import { openCertificate } from './certificate';

describe('openCertificate', () => {
  test('opens a .pfx with its passphrase', () => {
    const { pfx, passphrase } = testCertificate();
    const certificate = openCertificate(pfx, passphrase);
    expect(certificate.notAfter).toBe('2028-12-31');
    expect(certificate.privateKeyPem).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
    expect(certificate.certificatePem).toMatch(/BEGIN CERTIFICATE/);
  });

  test('picks the certificate that matches the key when a CA is listed first', () => {
    const { pfx, passphrase, certificatePem } = generateTestCertificate({ caFirst: true });
    const certificate = openCertificate(pfx, passphrase);
    expect(certificate.certificatePem).toBe(certificatePem);
  });

  test('a wrong passphrase is a config error, without echoing the passphrase', () => {
    const { pfx } = testCertificate();
    try {
      openCertificate(pfx, 'wrong-passphrase');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TribuError);
      expect((error as TribuError).kind).toBe('config');
      expect((error as TribuError).issues[0]?.path).toBe('certificate.passphrase');
      expect((error as TribuError).message).not.toContain('wrong-passphrase');
    }
  });

  test('a file that is not a .pfx is a config error', () => {
    expect(() => openCertificate(Buffer.from('not a certificate'), 'x')).toThrow(TribuError);
  });

  test('reports its validity dates so expiry can be checked', () => {
    const expired = generateTestCertificate({ notBefore: '2024-01-01', notAfter: '2025-12-31' });
    const certificate = openCertificate(expired.pfx, expired.passphrase);
    expect(certificate.notBefore).toBe('2024-01-01');
    expect(certificate.notAfter).toBe('2025-12-31');
  });
});
