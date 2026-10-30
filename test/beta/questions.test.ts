import { describe, expect, test } from 'vitest';
import { DocumentType } from '../../src/catalogs/index';
import { calculate } from '../../src/documents/calculate';
import { Recovery, Signature } from '../../src/index';
import { openCertificate } from '../../src/signing/certificate';
import { sign } from '../../src/signing/sign';
import { documentFileName } from '../../src/transport/file-name';
import { TransportFailure } from '../../src/transport/send';
import { zipDocument } from '../../src/transport/zip';
import { build } from '../../src/xml/build';
import { testCertificate } from '../support/certificate';
import { CUSTOMER, ISSUER } from '../support/client';
import { settings } from '../support/documents';
import { betaClient, betaTransport, expectAccepted, freshNumber, outcome } from './support';

const items = [{ description: 'Teclado', quantity: 2, price: 118 }];
const today = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

/** Sends hand-edited XML, for questions Tribu's own pipeline cannot ask. */
async function sendRaw(edit: (xml: string) => string) {
  const { pfx, passphrase } = testCertificate();
  const document = {
    ...calculate(DocumentType.Invoice, { customer: CUSTOMER, items }, settings({ today: today() })),
    number: freshNumber(),
  };
  const signed = sign(edit(build(document)), openCertificate(pfx, passphrase));
  const fileName = documentFileName(ISSUER.ruc, document);
  return betaTransport()
    .sendBill({ fileName, zip: zipDocument(fileName, signed) })
    .catch((error: unknown) => error);
}

describe('SUNAT beta: Milestone 0 questions', () => {
  test.each([
    ['RSA-SHA1', Signature.RsaSha1],
    ['RSA-SHA256', Signature.RsaSha256],
  ])('question 4: an Invoice signed with %s is accepted', async (_, signature) => {
    expectAccepted(
      await outcome(
        betaClient({ signature }).invoice({ customer: CUSTOMER, items, number: freshNumber() }),
      ),
    );
  });

  test('question 5: an Invoice without Payment Terms (ERR 3244 in the rules)', async () => {
    const answer = await sendRaw((xml) =>
      xml.replace(/<cac:PaymentTerms>.*?<\/cac:PaymentTerms>/g, ''),
    );
    // Record what beta does; the Milestone 0 results file quotes it.
    expect(
      answer instanceof TransportFailure ? answer.code : (answer as { code: string }).code,
    ).toBe('3244');
  });

  // Hypothesis 6 expected a duplicate code (1033, 2109, 2223). Beta instead accepts the same
  // file again with a fresh CDR, so beta cannot tell us what production does.
  test('question 6: beta accepts an identical re-send again, with no duplicate code', async () => {
    const sunat = betaClient();
    const first = await outcome(
      sunat.invoice({ customer: CUSTOMER, items, number: freshNumber() }),
    );
    expectAccepted(first);
    if (first.record === undefined) return;
    expectAccepted(await outcome(sunat.retry(first.record, { recovery: Recovery.Resend })));
  });
});
