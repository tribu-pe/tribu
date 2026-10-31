import { describe, expect, test } from 'vitest';
import { SignedXml } from 'xml-crypto';
import { testCertificate } from '../../test/support/certificate';
import { anInvoice } from '../../test/support/documents';
import { all, one, parseXml } from '../../test/support/xml';
import { Signature } from '../options';
import { build } from '../xml/build';
import { openCertificate } from './certificate';
import { sign } from './sign';

const DSIG = 'http://www.w3.org/2000/09/xmldsig#';
const signatureAt = 'ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature';

function signedInvoice(signature = Signature.RsaSha1) {
  const { pfx, passphrase } = testCertificate();
  const certificate = openCertificate(pfx, passphrase);
  const xml = build({ ...anInvoice(), number: 123 });
  return { signed: sign(xml, certificate, { signature }), certificate };
}

function verify(xml: string, certificatePem: string) {
  const root = parseXml(xml);
  const signatureNode = one(root, signatureAt);
  const verifier = new SignedXml({ publicCert: certificatePem });
  verifier.loadSignature(signatureNode.toString());
  return verifier.checkSignature(xml);
}

// Firma sheet of the validation workbook and Manual del Programador (signature example).
describe('sign', () => {
  test('puts one ds:Signature inside ext:ExtensionContent (ERR 2085)', () => {
    expect(all(parseXml(signedInvoice().signed), signatureAt)).toHaveLength(1);
  });

  test('ds:Signature has the Id that cac:Signature names (ERR 2085)', () => {
    expect(one(parseXml(signedInvoice().signed), signatureAt).getAttribute('Id')).toBe('SignTribu');
  });

  test('signs the whole document: Reference URI is empty (ERR 2090)', () => {
    const root = parseXml(signedInvoice().signed);
    expect(one(root, `${signatureAt}/ds:SignedInfo/ds:Reference`).getAttribute('URI')).toBe('');
  });

  test('uses an enveloped signature and inclusive C14N, as the manual shows', () => {
    const root = parseXml(signedInvoice().signed);
    const info = `${signatureAt}/ds:SignedInfo`;
    expect(one(root, `${info}/ds:CanonicalizationMethod`).getAttribute('Algorithm')).toBe(
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    );
    expect(
      one(root, `${info}/ds:Reference/ds:Transforms/ds:Transform`).getAttribute('Algorithm'),
    ).toBe(`${DSIG}enveloped-signature`);
  });

  test('embeds the certificate (ERR 2101)', () => {
    const root = parseXml(signedInvoice().signed);
    expect(all(root, `${signatureAt}/ds:KeyInfo/ds:X509Data/ds:X509Certificate`)).toHaveLength(1);
  });

  test('the signature verifies with the certificate', () => {
    const { signed, certificate } = signedInvoice();
    expect(verify(signed, certificate.certificatePem)).toBe(true);
  });

  test('changing one character after signing breaks it', () => {
    const { signed, certificate } = signedInvoice();
    expect(verify(signed.replace('CLIENTE SAC', 'CLIENTE SAD'), certificate.certificatePem)).toBe(
      false,
    );
  });

  test.each([
    [Signature.RsaSha1, `${DSIG}rsa-sha1`, `${DSIG}sha1`],
    [
      Signature.RsaSha256,
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      'http://www.w3.org/2001/04/xmlenc#sha256',
    ],
  ])('%o uses its signature and digest algorithms', (signature, signatureMethod, digestMethod) => {
    const root = parseXml(signedInvoice(signature).signed);
    const info = `${signatureAt}/ds:SignedInfo`;
    expect(one(root, `${info}/ds:SignatureMethod`).getAttribute('Algorithm')).toBe(signatureMethod);
    expect(one(root, `${info}/ds:Reference/ds:DigestMethod`).getAttribute('Algorithm')).toBe(
      digestMethod,
    );
  });

  test('keeps the XML free of carriage returns, which would change the digest', () => {
    expect(signedInvoice().signed).not.toContain('\r');
  });

  // Milestone 0, question 4: beta accepted RSA-SHA1 and RSA-SHA256; the default is the stronger.
  test('signs with RSA-SHA256 by default (ADR 0018)', () => {
    const { pfx, passphrase } = testCertificate();
    const signed = sign(build({ ...anInvoice(), number: 1 }), openCertificate(pfx, passphrase));
    expect(
      one(parseXml(signed), `${signatureAt}/ds:SignedInfo/ds:SignatureMethod`).getAttribute(
        'Algorithm',
      ),
    ).toBe('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
  });
});
