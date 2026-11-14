import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../context/AuthContext.js";
import { formatAmount, formatDate, type InboxItem } from "../format.js";

// Review Inbox (F-04 contract §2.1): the requests assigned to me that wait for a decision, oldest first, with
// loading, empty, and error states. Each row opens Request Detail, where the decision is made.
export function ReviewInbox() {
  const api = useApi();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ready"; requests: InboxItem[] }>({
    kind: "loading",
  });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await api("/api/reviews/inbox");
      if (!res.ok) return setState({ kind: "error" });
      setState({ kind: "ready", requests: (await res.json()).requests });
    } catch {
      setState({ kind: "error" });
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h1>Review Inbox</h1>
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
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {state.kind === "ready" && state.requests.length === 0 && <p>No requests are waiting for your review.</p>}
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
                <td>{request.title}</td>
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
