import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi } from "../context/AuthContext.js";
import { formatAmount, formatDate, type RequestSummary } from "../format.js";

// My Requests (F-03 contract §2.1): the requests I submitted, newest first, with loading, empty, and error states.
export function MyRequests() {
  const api = useApi();
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error" } | { kind: "ready"; requests: RequestSummary[] }
  >({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await api("/api/requests/mine");
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
      <h1>My Requests</h1>
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
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {state.kind === "ready" && state.requests.length === 0 && (
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
