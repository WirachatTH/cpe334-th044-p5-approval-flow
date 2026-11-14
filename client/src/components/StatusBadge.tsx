import { STATUS_LABEL, type RequestStatus } from "../format.js";

// The status as text, never as colour alone (NFR-11).
export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}
