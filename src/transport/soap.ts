import { escapeXml } from '../xml/escape';

const SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
const SERVICE = 'http://service.sunat.gob.pe';
const WSSE = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';

export const endpoints = {
  beta: {
    bill: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    consult: undefined,
  },
  production: {
    // Production billService: confirmed from SUNAT's "Servicios Web disponibles" list.
    bill: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
    consult: 'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService',
  },
} as const;

function envelope(
  auth: {
    readonly issuerRuc: string;
    readonly sol: { readonly user: string; readonly password: string };
  },
  body: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${SOAP}" xmlns:ser="${SERVICE}" xmlns:wsse="${WSSE}">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${escapeXml(`${auth.issuerRuc}${auth.sol.user}`)}</wsse:Username>
        <wsse:Password>${escapeXml(auth.sol.password)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`;
}

export interface SendBillInput {
  readonly issuerRuc: string;
  readonly sol: { readonly user: string; readonly password: string };
  readonly fileName: string;
  readonly zip: Uint8Array;
}

function zipBody(operation: 'sendBill' | 'sendSummary', input: SendBillInput): string {
  return envelope(
    input,
    `<ser:${operation}>
      <fileName>${escapeXml(`${input.fileName}.zip`)}</fileName>
      <contentFile>${Buffer.from(input.zip).toString('base64')}</contentFile>
    </ser:${operation}>`,
  );
}

/** The sendBill SOAP 1.1 envelope, with WS-Security UsernameToken = RUC + SOL user. */
export function sendBillEnvelope(input: SendBillInput): string {
  return zipBody('sendBill', input);
}

/** The sendSummary SOAP envelope: same shape, its own element (Manual del Programador §2.2). */
export function sendSummaryEnvelope(input: SendBillInput): string {
  return zipBody('sendSummary', input);
}

export interface GetStatusInput {
  readonly issuerRuc: string;
  readonly sol: { readonly user: string; readonly password: string };
  readonly ticket: string;
}

export function getStatusEnvelope(input: GetStatusInput): string {
  return envelope(
    input,
    `<ser:getStatus>
      <ticket>${escapeXml(input.ticket)}</ticket>
    </ser:getStatus>`,
  );
}

export interface GetStatusCdrInput {
  readonly issuerRuc: string;
  readonly sol: { readonly user: string; readonly password: string };
  readonly ruc: string;
  /** Catalog 01; SUNAT lists 01, 07 and 08 only (docs/research § CDR lookup). */
  readonly documentType: string;
  readonly series: string;
  readonly number: number;
}

// Element names follow SUNAT's billConsultService WSDL; Milestone 0 confirms them against production.
export function getStatusCdrEnvelope(input: GetStatusCdrInput): string {
  return envelope(
    input,
    `<ser:getStatusCdr>
      <ruc>${escapeXml(input.ruc)}</ruc>
      <tipoComprobante>${escapeXml(input.documentType)}</tipoComprobante>
      <serie>${escapeXml(input.series)}</serie>
      <numero>${escapeXml(String(input.number))}</numero>
    </ser:getStatusCdr>`,
  );
}
