import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi } from "../context/AuthContext.js";
import { STATUS_LABEL, formatAmount, formatDateTime, type RequestDetail as Detail } from "../format.js";

// Request Detail (F-03 contract §2.1): the fields, the decision when there is one, and the history, oldest first.
// Text from the request is always rendered as text by React, never as markup.
export function RequestDetail() {
  const api = useApi();
  const { id } = useParams();
  const submitted = (useLocation().state as { submitted?: string } | null)?.submitted;
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ready"; request: Detail }
  >({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await api(`/api/requests/${id}`);
      if (res.status === 404) return setState({ kind: "missing" });
      if (!res.ok) return setState({ kind: "error" });
      setState({ kind: "ready", request: (await res.json()).request });
    } catch {
      setState({ kind: "error" });
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div className="centered" role="status">
        <div className="spinner" aria-hidden="true" />
        <p>Loading request…</p>
      </div>
    );
  }
  if (state.kind === "missing") {
    return (
      <section>
        <h1>Not available</h1>
        <p>This request is not available to you.</p>
        <Link to="/requests">Back to My Requests</Link>
      </section>
    );
  }
  if (state.kind === "error") {
    return (
      <section>
        <p role="alert" className="form-error">
          Something went wrong. Please try again.
        </p>
        <button type="button" onClick={() => void load()}>
          Try again
        </button>
      </section>
    );
  }

  const { request } = state;
  return (
    <section>
      {submitted && <p role="status" className="banner-success">{`Request ${submitted} submitted.`}</p>}
      <h1>
        {request.requestNumber} <StatusBadge status={request.status} />
      </h1>
      <dl className="details">
        <dt>Title</dt>
        <dd>{request.title}</dd>
        <dt>Description</dt>
        <dd className="multiline">{request.description}</dd>
        <dt>Amount</dt>
        <dd>{`${formatAmount(request.amount)} THB`}</dd>
        <dt>Requester</dt>
        <dd>{request.requester.name}</dd>
        <dt>Reviewer</dt>
        <dd>{request.assignedReviewer.name}</dd>
        <dt>Submitted</dt>
        <dd>{formatDateTime(request.createdAt)}</dd>
      </dl>

      {request.decidedAt && (
        <div className="decision">
          <h2>Decision</h2>
          <p>{`${STATUS_LABEL[request.status]} by ${request.decidedBy?.name ?? ""} · ${formatDateTime(request.decidedAt)}`}</p>
          {request.decisionReason && <p className="multiline">{request.decisionReason}</p>}
        </div>
      )}

      <h2>History</h2>
      <ol className="history">
        {request.history.map((entry) => (
          <li key={entry.id}>
            <span>{`${STATUS_LABEL[entry.type]} by ${entry.actor.name} · ${formatDateTime(entry.createdAt)}`}</span>
            {entry.reason && <p className="multiline">{entry.reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
