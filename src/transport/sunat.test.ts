import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TransportFailure } from './send';
import { getStatusCdrEnvelope, getStatusEnvelope, sendSummaryEnvelope } from './soap';
import { sunatTransport } from './sunat';
import { zipDocument } from './zip';

const cdrXml = readFileSync(
  new URL('../../fixtures/sunat/cdr-rejected.xml', import.meta.url),
  'utf8',
);
const sol = { user: 'MODDATOS', password: 'MODDATOS' };
const issuerRuc = '20000000001';

function transport() {
  return sunatTransport({ env: 'beta', issuerRuc, sol, timeout: 1_000 });
}

function stubFetch(body: string, status = 200) {
  const mock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', mock);
  return mock;
}

function soapResponse(payload: string): string {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body>${payload}</soapenv:Body></soapenv:Envelope>`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SOAP envelopes', () => {
  test('sendSummary closes its own element, never sendBill', () => {
    const xml = sendSummaryEnvelope({ issuerRuc, sol, fileName: 'x', zip: new Uint8Array([1]) });
    expect(xml).toContain('<ser:sendSummary>');
    expect(xml).toContain('</ser:sendSummary>');
    expect(xml).not.toContain('sendBill');
  });

  test('getStatus sends the Ticket, not a file name', () => {
    const xml = getStatusEnvelope({ issuerRuc, sol, ticket: 'T-1' });
    expect(xml).toContain('<ticket>T-1</ticket>');
    expect(xml).not.toContain('.zip');
  });

  test('getStatusCdr sends RUC, type, series and number (docs/research § CDR lookup)', () => {
    const xml = getStatusCdrEnvelope({
      issuerRuc,
      sol,
      ruc: issuerRuc,
      documentType: '01',
      series: 'F001',
      number: 123,
    });
    expect(xml).toContain(`<ruc>${issuerRuc}</ruc>`);
    expect(xml).toContain('<tipoComprobante>01</tipoComprobante>');
    expect(xml).toContain('<serie>F001</serie>');
    expect(xml).toContain('<numero>123</numero>');
  });
});

describe('SUNAT answers', () => {
  test('sendBill unzips the base64 CDR', async () => {
    const zip = zipDocument('20000000001-01-F001-1', cdrXml);
    stubFetch(
      soapResponse(
        `<br:sendBillResponse><applicationResponse>${Buffer.from(zip).toString('base64')}</applicationResponse></br:sendBillResponse>`,
      ),
    );
    const cdr = await transport().sendBill({
      fileName: '20000000001-01-F001-1',
      zip: new Uint8Array(),
    });
    expect(cdr.documentId).toBe('FT01-982');
    expect(cdr.code).toBe('2047');
  });

  test('getStatus reads the CDR that comes in content when the ticket is done', async () => {
    const zip = zipDocument('x', cdrXml);
    stubFetch(
      soapResponse(
        `<br:getStatusResponse><statusCode>0</statusCode><content>${Buffer.from(zip).toString('base64')}</content></br:getStatusResponse>`,
      ),
    );
    const answer = await transport().getStatus('T-1');
    expect(answer.statusCode).toBe('0');
    expect(answer.cdr?.code).toBe('2047');
  });

  // Milestone 0: beta answered a Daily Summary with this fault and HTTP 200.
  test('a fault sent with HTTP 200 is still a fault, with its code', async () => {
    stubFetch(
      soapResponse(
        '<soap-env:Fault><faultcode>soap-env:Client.2074</faultcode><faultstring>UBLVersionID - La versi&#243;n del UBL no es correcta</faultstring></soap-env:Fault>',
      ),
    );
    const error = await transport()
      .sendSummary({ fileName: '20000000001-RC-20261030-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect((error as TransportFailure).code).toBe('2074');
  });

  // Format confirmed in beta (Milestone 0): faultcode is soap-env:Client.<code>.
  test('a SOAP fault keeps the code from faultcode', async () => {
    stubFetch(
      soapResponse(
        '<soapenv:Fault><faultcode>soap-env:Client.0102</faultcode><faultstring>Usuario o contrasena incorrectos</faultstring></soapenv:Fault>',
      ),
      500,
    );
    const error = await transport()
      .sendBill({ fileName: '20000000001-01-F001-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(TransportFailure);
    expect((error as TransportFailure).code).toBe('0102');
    expect((error as TransportFailure).sent).toBe(true);
  });

  test('a fault without a code in faultcode falls back to faultstring', async () => {
    stubFetch(
      soapResponse(
        '<soapenv:Fault><faultcode>soap-env:Client</faultcode><faultstring>0102 - Usuario o contrasena incorrectos</faultstring></soapenv:Fault>',
      ),
      500,
    );
    const error = await transport()
      .sendBill({ fileName: '20000000001-01-F001-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect((error as TransportFailure).code).toBe('0102');
  });

  test('digits inside the faultstring text are not a return code', async () => {
    stubFetch(
      soapResponse(
        '<soapenv:Fault><faultcode>soap:Server</faultcode><faultstring>Error at 2026-10-31T10:00:00, timed out after 30000 ms</faultstring></soapenv:Fault>',
      ),
      500,
    );
    const error = await transport()
      .sendBill({ fileName: '20000000001-01-F001-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(TransportFailure);
    expect((error as TransportFailure).code).toBeUndefined();
    expect((error as TransportFailure).sent).toBe(true);
  });
});

describe('network failures and retry safety (ADR 0015)', () => {
  test('a refused connection proves nothing left: sent false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
      }),
    );
    const error = await transport()
      .sendBill({ fileName: '20000000001-01-F001-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect((error as TransportFailure).sent).toBe(false);
  });

  // Milestone 0: SUNAT accepted an Invoice, the CDR could not be read, and the old code
  // re-sent it as if it never left. Reading happens after arrival: always sent true.
  test('an answer that cannot be read still counts as sent', async () => {
    stubFetch(
      soapResponse(
        '<br:sendBillResponse xmlns:br="http://service.sunat.gob.pe"><applicationResponse>bm90IGEgemlw</applicationResponse></br:sendBillResponse>',
      ),
    );
    const error = await transport()
      .sendBill({ fileName: '20000000001-01-F001-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(TransportFailure);
    expect((error as TransportFailure).sent).toBe(true);
  });

  test('a reset connection may have arrived: sent true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });
      }),
    );
    const error = await transport()
      .sendBill({ fileName: '20000000001-01-F001-1', zip: new Uint8Array() })
      .catch((reason: unknown) => reason);
    expect((error as TransportFailure).sent).toBe(true);
  });
});
