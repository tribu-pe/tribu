import type { Cdr } from '../results/record';
import { readCdr } from './read';
import {
  type CdrLookup,
  type StatusAnswer,
  type Submission,
  type SunatTransport,
  TransportFailure,
} from './send';
import {
  endpoints,
  getStatusCdrEnvelope,
  getStatusEnvelope,
  sendBillEnvelope,
  sendSummaryEnvelope,
} from './soap';
import { unzipXml } from './zip';

export interface SunatTransportInput {
  readonly env: 'beta' | 'production';
  readonly issuerRuc: string;
  readonly sol: { readonly user: string; readonly password: string };
  readonly timeout: number;
}

function localName(xml: string, name: string): string | undefined {
  const match = new RegExp(`<(?:[\\w.-]+:)?${name}[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`).exec(
    xml,
  );
  return match?.[1];
}

/**
 * Network codes that prove the request never left: retrying is safe (ADR 0015).
 * Everything else, including ECONNRESET, may have arrived and is treated as sent.
 */
const NOT_SENT = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function neverSent(error: unknown): boolean {
  const cause = (error as { readonly cause?: { readonly code?: string } } | null)?.cause;
  return cause?.code !== undefined && NOT_SENT.has(cause.code);
}

/** SUNAT reports faults with HTTP 500; the code rides in faultcode or faultstring. */
function faultOf(xml: string, status: number): TransportFailure {
  const faultcode = localName(xml, 'faultcode')?.trim();
  const faultstring = localName(xml, 'faultstring')?.trim();
  const code = /(\d{4})/.exec(faultcode ?? '')?.[1] ?? /(\d{4})/.exec(faultstring ?? '')?.[1];
  const message = faultstring ?? faultcode ?? `SUNAT answered HTTP ${status}`;
  return new TransportFailure(message, code === undefined ? { sent: true } : { sent: true, code });
}

async function post(url: string, body: string, timeout: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body,
      signal: controller.signal,
    });
    // Faults arrive with HTTP 500; read the body before deciding, or the code is lost.
    const text = await response.text();
    if (!response.ok) throw faultOf(text, response.status);
    return text;
  } catch (error) {
    if (error instanceof TransportFailure) throw error;
    // Only a code that proves nothing left may be retried; the rest may have reached SUNAT.
    throw new TransportFailure(error instanceof Error ? error.message : String(error), {
      sent: !neverSent(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

function cdrFromBase64(content: string): Cdr {
  const bytes = Buffer.from(content.trim(), 'base64');
  const zipped = bytes[0] === 0x50 && bytes[1] === 0x4b;
  return readCdr(zipped ? unzipXml(bytes) : bytes.toString('utf8'));
}

/** The answer carries the CDR as a ZIP inside base64 (docs/research § Ticket status). */
function decodeApplicationResponse(xml: string): Cdr {
  const inline = (localName(xml, 'applicationResponse') ?? localName(xml, 'content'))?.trim();
  if (inline !== undefined && inline !== '') return cdrFromBase64(inline);
  if (localName(xml, 'ApplicationResponse') !== undefined) return readCdr(xml);
  throw faultOf(xml, 500);
}

function statusAnswer(xml: string): StatusAnswer {
  const statusCode = localName(xml, 'statusCode')?.trim();
  if (statusCode === undefined) {
    throw new TransportFailure('SUNAT did not answer with a status', { sent: true });
  }
  const content = localName(xml, 'content')?.trim();
  return content === undefined || content === ''
    ? { statusCode }
    : { statusCode, cdr: cdrFromBase64(content) };
}

// shortcut: the SOAP bodies are read by local-name regex; Milestone 0 confirms the production WSDL.
export function sunatTransport(input: SunatTransportInput): SunatTransport {
  const billService = endpoints[input.env].bill;
  const consultService = endpoints[input.env].consult;

  return {
    async sendBill(submission: Submission): Promise<Cdr> {
      return decodeApplicationResponse(
        await post(
          billService,
          sendBillEnvelope({
            issuerRuc: input.issuerRuc,
            sol: input.sol,
            fileName: submission.fileName,
            zip: submission.zip,
          }),
          input.timeout,
        ),
      );
    },

    async sendSummary(submission: Submission): Promise<{ ticket: string }> {
      const text = await post(
        billService,
        sendSummaryEnvelope({
          issuerRuc: input.issuerRuc,
          sol: input.sol,
          fileName: submission.fileName,
          zip: submission.zip,
        }),
        input.timeout,
      );
      const ticket = localName(text, 'ticket')?.trim();
      if (ticket === undefined) {
        throw new TransportFailure('SUNAT did not answer with a Ticket', { sent: true });
      }
      return { ticket };
    },

    async getStatus(ticket: string): Promise<StatusAnswer> {
      const text = await post(
        billService,
        getStatusEnvelope({ issuerRuc: input.issuerRuc, sol: input.sol, ticket }),
        input.timeout,
      );
      return statusAnswer(text);
    },

    ...(consultService === undefined
      ? {}
      : {
          async getStatusCdr(lookup: CdrLookup): Promise<Cdr | undefined> {
            const text = await post(
              consultService,
              getStatusCdrEnvelope({
                issuerRuc: input.issuerRuc,
                sol: input.sol,
                ruc: lookup.ruc,
                documentType: lookup.documentType,
                series: lookup.series,
                number: lookup.number,
              }),
              input.timeout,
            );
            return decodeApplicationResponse(text);
          },
        }),
  } as SunatTransport;
}
