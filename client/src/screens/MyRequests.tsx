import { Link } from "react-router-dom";
import { FilterBar } from "../components/FilterBar.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { STATUS_LABEL, formatAmount, formatDate, type RequestStatus, type RequestSummary } from "../format.js";
import { useFilteredList } from "../useFilteredList.js";

const STATUSES = Object.keys(STATUS_LABEL) as RequestStatus[];

// My Requests (F-03 contract §2.1, changed by F-08): the requests I submitted, newest first, with filters and with
// loading, empty, and error states.
export function MyRequests() {
  const { state, reload, filtered, bar } = useFilteredList<RequestSummary>("/api/requests/mine");

  return (
    <section>
      <h1>My Requests</h1>
      <FilterBar {...bar} statuses={STATUSES} />
      {state.kind === "loading" && (
        <div className="centered" role="status">
          <div className="spinner" aria-hidden="true" />
          <p>Loading your requests…</p>
        </div>
      )}
      {state.kind === "error" && (
        <div>
          <p role="alert" className="form-error">
            Something went wrong. Please try again.
          </p>
          <button type="button" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      )}
      {state.kind === "ready" && state.requests.length === 0 && filtered && <p>No requests match these filters.</p>}
      {state.kind === "ready" && state.requests.length === 0 && !filtered && (
        <p>
          You have not submitted any requests yet. <Link to="/requests/new">New Request</Link>
        </p>
      )}
      {state.kind === "ready" && state.requests.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Number</th>
              <th scope="col">Title</th>
              <th scope="col">Amount (THB)</th>
              <th scope="col">Status</th>
              <th scope="col">Reviewer</th>
              <th scope="col">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {state.requests.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link to={`/requests/${request.id}`}>{request.requestNumber}</Link>
                </td>
                <td>{request.title}</td>
                <td className="amount">{formatAmount(request.amount)}</td>
                <td>
                  <StatusBadge status={request.status} />
                </td>
                <td>{request.assignedReviewer.name}</td>
                <td>{formatDate(request.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
