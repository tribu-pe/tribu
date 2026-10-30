import { ResponseCode, TicketStatus } from '../catalogs/shared';
import { Lifecycle, type LifecycleState } from './lifecycle';

const states = Lifecycle.define('status', {
  Issued: { from: [], why: 'Tribu signed it; SUNAT has not answered yet.' },
  Processing: {
    from: [TicketStatus.InProgress],
    why: 'SUNAT accepted a Ticket and is still working.',
  },
  Accepted: {
    from: [ResponseCode.Accepted, ResponseCode.Observation],
    why: 'SUNAT accepted the document.',
  },
  Rejected: {
    from: [ResponseCode.Rejection],
    why: 'SUNAT evaluated the document and rejected it.',
  },
  Unconfirmed: { from: [], why: 'The answer was lost; SUNAT may or may not have the document.' },
  Voided: { from: [], why: 'The document was voided by a Voided Documents communication.' },
});

function fromResponse(code: string): LifecycleState | undefined {
  const answer = ResponseCode.classify(code);
  return states.all().find((state) => state.from.includes(answer));
}

function fromTicket(code: string): LifecycleState | undefined {
  const ticket = TicketStatus.from(code);
  return states.all().find((state) => state.from.includes(ticket));
}

/** Tribu's model of a document's life (ADR 0014); not a SUNAT catalog. */
export const Status = { ...states, fromResponse, fromTicket };
