import { Link } from "react-router-dom";
import { FilterBar } from "../components/FilterBar.js";
import { formatAmount, formatDate, type InboxItem, type RequestStatus } from "../format.js";
import { useFilteredList } from "../useFilteredList.js";

// The two statuses the inbox can hold (F-07).
const STATUSES: RequestStatus[] = ["SUBMITTED", "AWAITING_SECOND_APPROVAL"];

// Review Inbox (F-04 contract §2.1, changed by F-07 and F-08): the requests I may decide next, oldest first, with
// filters and with loading, empty, and error states. Each row opens Request Detail, where the decision is made.
export function ReviewInbox() {
  const { state, reload, filtered, bar } = useFilteredList<InboxItem>("/api/reviews/inbox");

  return (
    <section>
      <h1>Review Inbox</h1>
      <FilterBar {...bar} statuses={STATUSES} />
      {state.kind === "loading" && (
        <div className="centered" role="status">
          <div className="spinner" aria-hidden="true" />
          <p>Loading your inbox…</p>
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
      {state.kind === "ready" && state.requests.length === 0 && (
        <p>{filtered ? "No requests match these filters." : "No requests are waiting for your review."}</p>
      )}
      {state.kind === "ready" && state.requests.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Number</th>
              <th scope="col">Title</th>
              <th scope="col">Requester</th>
              <th scope="col">Amount (THB)</th>
              <th scope="col">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {state.requests.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link to={`/requests/${request.id}`}>{request.requestNumber}</Link>
                </td>
                <td>
                  {request.title}
                  {request.status === "AWAITING_SECOND_APPROVAL" && (
                    <>
                      {" "}
                      <span className="status status-awaiting_second_approval">Second approval</span>
                    </>
                  )}
                </td>
                <td>{request.requester.name}</td>
                <td className="amount">{formatAmount(request.amount)}</td>
                <td>{formatDate(request.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
