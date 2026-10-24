import { describe, expect, test } from 'vitest';
import { ResponseCode, TicketStatus } from '../catalogs/index';
import { Status } from './status';

// ADR 0014: Status is Tribu's model. Each state names the SUNAT Catalog entries that produce it.
describe('Status', () => {
  test('has exactly the six states of the glossary', () => {
    expect(Status.all().map((state) => state.code)).toEqual([
      'issued',
      'processing',
      'accepted',
      'rejected',
      'unconfirmed',
      'voided',
    ]);
  });

  test('every state explains itself', () => {
    for (const state of Status.all()) expect(state.why.length, state.code).toBeGreaterThan(0);
  });

  test('maps only from SUNAT Catalog entries, never from raw codes', () => {
    expect(Status.Processing.from).toEqual([TicketStatus.InProgress]);
    expect(Status.Accepted.from).toEqual([ResponseCode.Accepted, ResponseCode.Observation]);
    expect(Status.Rejected.from).toEqual([ResponseCode.Rejection]);
  });

  test('states no SUNAT answer produces have an empty from', () => {
    expect(Status.Issued.from).toEqual([]);
    expect(Status.Unconfirmed.from).toEqual([]);
  });

  test.each([
    ['0', Status.Accepted],
    ['4031', Status.Accepted],
    ['2108', Status.Rejected],
  ])('a CDR with ResponseCode %s means %o', (code, state) => {
    expect(Status.fromResponse(code)).toBe(state);
  });

  test('an exception changes nothing: SUNAT did not evaluate the document', () => {
    expect(Status.fromResponse('0102')).toBeUndefined();
    expect(Status.fromResponse('1033')).toBeUndefined();
  });

  test('a ticket in progress is Processing', () => {
    expect(Status.fromTicket(TicketStatus.InProgress.code)).toBe(Status.Processing);
  });

  test('is not a SUNAT Catalog (ADR 0014)', () => {
    expect(Status.kind).toBe('lifecycle');
  });
});
