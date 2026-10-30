import { sendDeadline as dailySummarySendDeadline } from './daily-summary/send-deadline';
import { customerNameFormat } from './document/customer-name-format';
import { issueDateNotInFuture } from './document/issue-date-not-in-future';
import { customerHasRuc } from './invoice/customer-has-ruc';
import { sendDeadline as invoiceSendDeadline } from './invoice/send-deadline';
import { seriesFormat as invoiceSeriesFormat } from './invoice/series-format';
import { classificationFormat } from './item/classification-format';
import { affectedIdFormat } from './note/affected-id-format';
import { affectedNotRejected } from './note/affected-not-rejected';
import { affectedNotVoided } from './note/affected-not-voided';
import { currencyMatchesAffectedInvoice } from './note/currency-matches-affected-invoice';
import { currencyMatchesAffectedReceipt } from './note/currency-matches-affected-receipt';
import { invoiceNoteModifiesInvoice } from './note/invoice-note-modifies-invoice';
import { issuedOnOrAfterAffected } from './note/issued-on-or-after-affected';
import { receiptNoteModifiesReceipt } from './note/receipt-note-modifies-receipt';
import { totalWithinAffected } from './note/total-within-affected';
import { creditHasInstallments } from './payment/credit-has-installments';
import { installmentDueAfterIssue } from './payment/installment-due-after-issue';
import { installmentsSumToPending } from './payment/installments-sum-to-pending';
import { customerIdentifiedAboveLimit } from './receipt/customer-identified-above-limit';
import { individualSendDeadline } from './receipt/individual-send-deadline';
import { seriesFormat as receiptSeriesFormat } from './receipt/series-format';
import type { Rule } from './rule';
import { deadline as voidedDocumentsDeadline } from './voided-documents/deadline';

/** Every Rule Tribu applies. `registry.test.ts` fails if one lacks its test file. */
export const defaultRules: readonly Rule[] = [
  customerNameFormat,
  issueDateNotInFuture,
  customerHasRuc,
  invoiceSendDeadline,
  invoiceSeriesFormat,
  receiptSeriesFormat,
  customerIdentifiedAboveLimit,
  individualSendDeadline,
  dailySummarySendDeadline,
  voidedDocumentsDeadline,
  classificationFormat,
  creditHasInstallments,
  installmentDueAfterIssue,
  installmentsSumToPending,
  affectedIdFormat,
  affectedNotRejected,
  affectedNotVoided,
  currencyMatchesAffectedInvoice,
  currencyMatchesAffectedReceipt,
  invoiceNoteModifiesInvoice,
  receiptNoteModifiesReceipt,
  issuedOnOrAfterAffected,
  totalWithinAffected,
];
