import { describe, expect, test } from 'vitest';
import { all, parseXml, text } from '../../test/support/xml';
import { endpoints, sendBillEnvelope } from './soap';

// Manual del Programador §2.2 and the sendBill example: soapenv / ser="http://service.sunat.gob.pe" /
// wsse UsernameToken with Username = RUC + SOL user.
describe('sendBill envelope', () => {
  const envelope = parseXml(
    sendBillEnvelope({
      issuerRuc: '20000000001',
      sol: { user: 'MODDATOS', password: 'MODDATOS' },
      fileName: '20000000001-01-F001-123',
      zip: new Uint8Array([1, 2, 3]),
    }),
  );

  test('is a SOAP 1.1 envelope', () => {
    expect(envelope.namespaceURI).toBe('http://schemas.xmlsoap.org/soap/envelope/');
    expect(envelope.localName).toBe('Envelope');
  });

  test('authenticates with WS-Security: the RUC concatenated with the SOL user', () => {
    const token = 'soapenv:Header/wsse:Security/wsse:UsernameToken';
    expect(text(envelope, `${token}/wsse:Username`)).toBe('20000000001MODDATOS');
    expect(text(envelope, `${token}/wsse:Password`)).toBe('MODDATOS');
  });

  test('calls ser:sendBill with the ZIP file name', () => {
    const [call] = all(envelope, 'soapenv:Body/ser:sendBill');
    expect(call?.namespaceURI).toBe('http://service.sunat.gob.pe');
    expect(text(envelope, 'soapenv:Body/ser:sendBill/fileName')).toBe(
      '20000000001-01-F001-123.zip',
    );
  });

  // The manual's example references an attachment (cid:…); the content inline as base64 is the common
  // practice. Milestone 0 confirms which one beta accepts.
  test('carries the ZIP as base64', () => {
    expect(text(envelope, 'soapenv:Body/ser:sendBill/contentFile')).toBe('AQID');
  });
});

describe('endpoints', () => {
  test('beta billService (orientacion.sunat.gob.pe/12-pautas-servicio-beta)', () => {
    expect(endpoints.beta.bill).toBe(
      'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    );
  });

  test('the CDR lookup exists in production only (docs/research § CDR lookup)', () => {
    expect(endpoints.production.consult).toBe(
      'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService',
    );
    expect(endpoints.beta.consult).toBeUndefined();
  });

  test("production billService (SUNAT's 'Servicios Web disponibles', docs/research § Web service endpoints)", () => {
    expect(endpoints.production.bill).toBe(
      'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
    );
  });
});
