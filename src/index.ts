import { type CreateOptions, create } from './create';

export {
  Affectation,
  Currency,
  DocumentType,
  Identity,
  Igv,
  ResponseCode,
  ReturnCode,
  TicketStatus,
  Unit,
} from './catalogs/index';
export { Dni } from './documents/dni';
export { DocumentId } from './documents/document-id';
export { Money } from './documents/money';
export { Ruc } from './documents/ruc';
export { Recovery, Rounding, Signature } from './options';
export { Status } from './results/status';
export { TribuError } from './results/tribu-error';
export type { CreateOptions };

const tribu = { create };

export default tribu;
