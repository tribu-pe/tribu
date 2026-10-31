import { mkdirSync, writeFileSync } from 'node:fs';
import { expect } from 'vitest';
import tribu, { Status, TribuError } from '../../src/index';
import type { IssueResult, TribuRecord } from '../../src/results/record';
import type { SunatTransport } from '../../src/transport/send';
import { sunatTransport } from '../../src/transport/sunat';
import { build } from '../../src/xml/build';
import { testCertificate } from '../support/certificate';
import { BETA_SOL, ISSUER } from '../support/client';

// Milestone 0: beta's nginx answers HTTP 401 to a request sent right after another; 1 s apart
// is enough. The tests space every call; Tribu itself does not (production is unmeasured).
const SPACING_MS = 1_500;
let lastCall = 0;

async function spaced<T>(call: () => Promise<T>): Promise<T> {
  const wait = lastCall + SPACING_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  try {
    return await call();
  } finally {
    lastCall = Date.now();
  }
}

/** The real transport to SUNAT beta, one call every SPACING_MS. */
export function betaTransport(): SunatTransport {
  const real = sunatTransport({
    env: 'beta',
    issuerRuc: ISSUER.ruc,
    sol: BETA_SOL,
    timeout: 30_000,
  });
  return {
    sendBill: (submission) => spaced(() => real.sendBill(submission)),
    sendSummary: (submission) => spaced(() => real.sendSummary(submission)),
    getStatus: (ticket) => spaced(() => real.getStatus(ticket)),
  };
}

/** A client against the real SUNAT beta, signed with a generated self-signed Certificate. */
export function betaClient(options: Partial<Parameters<typeof tribu.create>[0]> = {}) {
  const { pfx, passphrase } = testCertificate();
  return tribu.create({
    env: 'beta',
    issuer: ISSUER,
    sol: BETA_SOL,
    certificate: { pfx, passphrase },
    transport: betaTransport(),
    ...options,
  });
}

let last = 0;

/** Beta keeps every Number it registered, so each call takes a fresh one from the clock. */
export function freshNumber(): number {
  last = Math.max(last + 1, Math.floor(Date.now() / 1000) % 100_000_000);
  return last;
}

type Outcome = { record?: TribuRecord | undefined; error?: TribuError | undefined };

/** Runs an issue call without throwing, so a failure shows SUNAT's whole answer. */
export async function outcome(call: Promise<IssueResult>): Promise<Outcome> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof TribuError) return { record: error.record as TribuRecord, error };
    throw error;
  }
}

export function detail(result: Outcome): string {
  return JSON.stringify(
    { status: result.record?.status?.code, cdr: result.record?.cdr, error: result.error },
    (key, value) => (key === 'xml' || key === 'document' ? undefined : value),
    2,
  );
}

export function expectAccepted(result: Outcome): void {
  expect(result.record?.status?.code, detail(result)).toBe(Status.Accepted.code);
  expect(result.record?.cdr?.observations, detail(result)).toEqual([]);
  // Shows SUNAT's own words under each test, so a run proves something to whoever watches it.
  process.stdout.write(`SUNAT ${result.record?.cdr?.code}: ${result.record?.cdr?.description}\n`);
}

/** Keeps an accepted document as a golden fixture: the input and the XML SUNAT accepted, unsigned. */
export function keepGolden(folder: string, name: string, input: object, result: Outcome): void {
  const document = result.record?.document;
  if (document === undefined) return;
  const directory = `fixtures/${folder}/${name}`;
  mkdirSync(directory, { recursive: true });
  const { number, issueDate } = document;
  writeFileSync(
    `${directory}/input.json`,
    `${JSON.stringify({ ...input, number, issueDate }, null, 2)}
`,
  );
  writeFileSync(
    `${directory}/expected.xml`,
    `${build(document)}
`,
  );
}
