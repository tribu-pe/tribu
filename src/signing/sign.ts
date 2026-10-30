import { SignedXml } from 'xml-crypto';
import { Signature, type SignatureValue } from '../options';
import { SIGNATURE_ID } from '../xml/build';
import type { OpenCertificate } from './certificate';

const DSIG = 'http://www.w3.org/2000/09/xmldsig#';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const RSA_SHA1 = `${DSIG}rsa-sha1`;
const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
const SHA1 = `${DSIG}sha1`;
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256';

/** Signs the whole document inside ext:ExtensionContent (ERR 2085, 2090, 2101). */
export function sign(
  xml: string,
  certificate: OpenCertificate,
  options: { readonly signature?: SignatureValue } = {},
): string {
  const signature = options.signature ?? Signature.RsaSha256;
  const sha1 = signature.algorithm === 'rsa-sha1';
  const signer = new SignedXml({
    privateKey: certificate.privateKeyPem,
    publicCert: certificate.certificatePem,
    signatureAlgorithm: sha1 ? RSA_SHA1 : RSA_SHA256,
    canonicalizationAlgorithm: C14N,
  });
  signer.addReference({
    xpath: '/*',
    uri: '',
    isEmptyUri: true,
    transforms: [`${DSIG}enveloped-signature`],
    digestAlgorithm: sha1 ? SHA1 : SHA256,
  });
  signer.computeSignature(xml, {
    prefix: 'ds',
    attrs: { Id: SIGNATURE_ID },
    location: { reference: "//*[local-name()='ExtensionContent']", action: 'append' },
  });
  return signer.getSignedXml().replace(/\r/g, '');
}
