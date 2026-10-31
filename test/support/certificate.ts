import { generateKeyPairSync } from 'node:crypto';
import forge from 'node-forge';

export interface TestCertificate {
  pfx: Buffer;
  passphrase: string;
  certificatePem: string;
}

/**
 * A self-signed certificate generated at test time. Real certificates never enter the
 * repository (AGENTS.md rule 5); this one exists only in memory.
 */
export function generateTestCertificate(
  options: {
    notBefore?: string;
    notAfter?: string;
    passphrase?: string;
    /** Put an unrelated CA certificate before the real one, as some providers' .pfx files do. */
    caFirst?: boolean;
  } = {},
): TestCertificate {
  const passphrase = options.passphrase ?? 'test-passphrase';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const certificate = forge.pki.createCertificate();
  certificate.publicKey = forge.pki.publicKeyFromPem(publicKey);
  certificate.serialNumber = '01';
  certificate.validity.notBefore = new Date(`${options.notBefore ?? '2026-01-01'}T00:00:00Z`);
  certificate.validity.notAfter = new Date(`${options.notAfter ?? '2028-12-31'}T23:59:59Z`);
  const subject = [
    { name: 'commonName', value: 'EMPRESA DE PRUEBA SAC' },
    { name: 'countryName', value: 'PE' },
  ];
  certificate.setSubject(subject);
  certificate.setIssuer(subject);
  const key = forge.pki.privateKeyFromPem(privateKey);
  certificate.sign(key, forge.md.sha256.create());

  const chain = [certificate];
  if (options.caFirst === true) {
    const ca = forge.pki.createCertificate();
    ca.publicKey = forge.pki.rsa.generateKeyPair({ bits: 1024 }).publicKey;
    ca.serialNumber = '02';
    ca.validity.notBefore = certificate.validity.notBefore;
    ca.validity.notAfter = certificate.validity.notAfter;
    ca.setSubject([{ name: 'commonName', value: 'AUTORIDAD DE PRUEBA' }]);
    ca.setIssuer([{ name: 'commonName', value: 'AUTORIDAD DE PRUEBA' }]);
    ca.sign(key, forge.md.sha256.create());
    chain.unshift(ca);
  }

  const p12 = forge.pkcs12.toPkcs12Asn1(key, chain, passphrase, { algorithm: '3des' });
  const pfx = Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary');
  return { pfx, passphrase, certificatePem: forge.pki.certificateToPem(certificate) };
}

let shared: TestCertificate | undefined;

/** One certificate per test process: RSA key generation is slow. */
export function testCertificate(): TestCertificate {
  shared ??= generateTestCertificate();
  return shared;
}
