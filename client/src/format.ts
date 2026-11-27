// How amounts, dates, and statuses are shown (SDS §4.2): THB with grouping and two decimals, dates in Asia/Bangkok.

const AMOUNT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

// The API sends amounts as strings so no precision is lost; at most 1,000,000.00 is safe to format as a number.
export function formatAmount(amount: string): string {
  return AMOUNT.format(Number(amount));
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${DATE.format(new Date(iso))} ${TIME.format(new Date(iso))}`;
}

export type RequestStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "RETURNED";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
};

// A history entry is named after the status it led to, except a resubmission, which leads back to SUBMITTED.
export type EventType = RequestStatus | "RESUBMITTED";

export const EVENT_LABEL: Record<EventType, string> = { ...STATUS_LABEL, RESUBMITTED: "Resubmitted" };

// Why a request was rejected (F-04 contract section 2.1). The select offers them in this order.
export type RejectionCategory = "BUDGET" | "INCOMPLETE" | "DUPLICATE" | "POLICY" | "OTHER";

export const CATEGORY_LABEL: Record<RejectionCategory, string> = {
  BUDGET: "Budget not available",
  INCOMPLETE: "Information missing or unclear",
  DUPLICATE: "Duplicate request",
  POLICY: "Not allowed by policy",
  OTHER: "Other",
};

export interface PersonRef {
  id: number;
  name: string;
}

export interface RequestSummary {
  id: number;
  requestNumber: string;
  title: string;
  amount: string;
  status: RequestStatus;
  assignedReviewer: PersonRef;
  createdAt: string;
}

// A row of the review inbox (F-04 contract section 2.2).
export interface InboxItem {
  id: number;
  requestNumber: string;
  title: string;
  amount: string;
  requester: PersonRef;
  createdAt: string;
}

export interface HistoryEntry {
  id: number;
  type: EventType;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  actor: PersonRef;
  reason: string | null;
  // Set only on a rejection that recorded one.
  category: RejectionCategory | null;
  createdAt: string;
}

export interface RequestDetail extends RequestSummary {
  description: string;
  requester: PersonRef;
  decidedBy: PersonRef | null;
  decisionCategory: RejectionCategory | null;
  decisionReason: string | null;
  decidedAt: string | null;
  // One higher after each resubmission (BR-16).
  revision: number;
  updatedAt: string;
  history: HistoryEntry[];
}
