import forge from 'node-forge';
import { TribuError } from '../results/tribu-error';

const PKCS8_SHROUDED_KEY_BAG = '1.2.840.113549.1.12.10.1.2';
const KEY_BAG = '1.2.840.113549.1.12.10.1.1';
const CERT_BAG = '1.2.840.113549.1.12.10.1.3';

export interface OpenCertificate {
  readonly notBefore: string;
  readonly notAfter: string;
  readonly privateKeyPem: string;
  readonly certificatePem: string;
}

function config(why: string, path = 'certificate'): TribuError {
  return new TribuError({
    kind: 'config',
    issues: [
      {
        code: 'certificate',
        path,
        why,
        fix: 'Open the .pfx with the right passphrase; Tribu never echoes it.',
        source: 'ADR 0009',
      },
    ],
  });
}

/** Opens the .pfx once, at tribu.create, so a wrong passphrase never waits for the first invoice. */
export function openCertificate(pfx: Buffer, passphrase: string): OpenCertificate {
  let store: forge.pkcs12.Pkcs12Pfx;
  try {
    const der = forge.util.createBuffer(pfx.toString('binary'));
    store = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), passphrase);
  } catch {
    throw config(
      'The certificate could not be opened with this passphrase.',
      'certificate.passphrase',
    );
  }

  const shrouded = store.getBags({ bagType: PKCS8_SHROUDED_KEY_BAG })[PKCS8_SHROUDED_KEY_BAG];
  const plain = store.getBags({ bagType: KEY_BAG })[KEY_BAG];
  const certificates = store.getBags({ bagType: CERT_BAG })[CERT_BAG];
  const key = shrouded?.[0]?.key ?? plain?.[0]?.key;
  // A .pfx may list the CA chain too, in any order: the right certificate is the one whose
  // public key belongs to the private key.
  const modulus = (key as forge.pki.rsa.PrivateKey | undefined)?.n;
  const certificate = certificates?.find((bag) => {
    const publicKey = bag.cert?.publicKey as forge.pki.rsa.PublicKey | undefined;
    return modulus !== undefined && publicKey?.n.equals(modulus) === true;
  })?.cert;

  if (key === undefined || certificate === undefined) {
    throw config('The .pfx holds no private key and certificate pair.');
  }

  return {
    notBefore: certificate.validity.notBefore.toISOString().slice(0, 10),
    notAfter: certificate.validity.notAfter.toISOString().slice(0, 10),
    privateKeyPem: forge.pki.privateKeyToPem(key),
    certificatePem: forge.pki.certificateToPem(certificate),
  };
}
