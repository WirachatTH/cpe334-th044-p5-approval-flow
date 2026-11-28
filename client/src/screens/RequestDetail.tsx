import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { DecisionPanel } from "../components/DecisionPanel.js";
import { ResubmitForm } from "../components/ResubmitForm.js";
import { ReturnPanel } from "../components/ReturnPanel.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi, useAuth } from "../context/AuthContext.js";
import {
  CATEGORY_LABEL, EVENT_LABEL, STATUS_LABEL, formatAmount, formatDateTime, type RequestDetail as Detail,
} from "../format.js";

// Request Detail (F-03 contract §2.1): the fields, the decision when there is one, and the history, oldest first.
// For the assigned reviewer of a SUBMITTED request it also shows the decision panel (F-04 contract §2.1) and the
// return panel, and for the requester of a RETURNED request the resubmit form (F-06 contract §2.1). While a request
// waits for the second approval, the panel is shown to a reviewer who may give it (F-07 contract §2.1).
// Text from the request is always rendered as text by React, never as markup.
export function RequestDetail() {
  const api = useApi();
  const { user } = useAuth();
  const { id } = useParams();
  const submitted = (useLocation().state as { submitted?: string } | null)?.submitted;
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ready"; request: Detail }
  >({ kind: "loading" });
  // What the last action led to: the success banner, or the message of a 409. Kept outside `state` so that loading the
  // request again does not clear it.
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setState({ kind: "loading" });
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
  const waiting = request.status === "AWAITING_SECOND_APPROVAL";
  const assignedTurn = request.status === "SUBMITTED" && user?.id === request.assignedReviewer.id;
  const firstApprover = waiting && user?.id === request.firstApproval?.by.id;
  const secondTurn =
    waiting && user?.role === "REVIEWER" && user.id !== request.requester.id && !firstApprover;
  const canResubmit = request.status === "RETURNED" && user?.id === request.requester.id;
  const done = (changed: Detail, text: string) => {
    setState({ kind: "ready", request: changed });
    setNotice({ kind: "success", text });
  };
  const conflict = (text: string) => {
    setNotice({ kind: "error", text });
    void load(false);
  };
  const unavailable = () => setState({ kind: "missing" });
  return (
    <section>
      {notice ? (
        <p role={notice.kind === "success" ? "status" : "alert"} className={notice.kind === "success" ? "banner-success" : "form-error"}>
          {notice.text}
        </p>
      ) : (
        submitted && <p role="status" className="banner-success">{`Request ${submitted} submitted.`}</p>
      )}
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

      {/* Above the panel, so that a second reviewer reads the first approval before deciding (F-07 contract §2.1). */}
      {request.decidedAt && (
        <div className="decision" role="group" aria-labelledby="decision-title">
          <h2 id="decision-title">Decision</h2>
          {/* While the request waits, the decision on it so far is the first approval. */}
          <p>{`${waiting ? EVENT_LABEL.FIRST_APPROVED : STATUS_LABEL[request.status]} by ${request.decidedBy?.name ?? ""} · ${formatDateTime(request.decidedAt)}`}</p>
          {/* A rejection made before the category existed has none, and says so (F-04 contract section 2.1). */}
          {request.status === "REJECTED" && (
            <p>{`Category: ${request.decisionCategory ? CATEGORY_LABEL[request.decisionCategory] : "Not recorded"}`}</p>
          )}
          {request.decisionReason && <p className="multiline">{request.decisionReason}</p>}
        </div>
      )}

      {(assignedTurn || secondTurn) && (
        <DecisionPanel
          requestId={request.id}
          revision={request.revision}
          onDecided={(decided, choice) => {
            if (decided.status === "AWAITING_SECOND_APPROVAL") {
              return done(decided, "Request approved. A second approval is needed.");
            }
            done(decided, choice === "APPROVE" ? "Request approved." : "Request rejected.");
          }}
          onConflict={conflict}
          onUnavailable={unavailable}
        />
      )}
      {assignedTurn && (
        <ReturnPanel
          requestId={request.id}
          revision={request.revision}
          onReturned={(returned) => done(returned, "Request returned.")}
          onConflict={conflict}
          onUnavailable={unavailable}
        />
      )}
      {firstApprover && <p>Waiting for a second reviewer.</p>}

      {canResubmit && (
        <ResubmitForm
          request={request}
          onResubmitted={(resubmitted) => done(resubmitted, "Request resubmitted.")}
          onConflict={conflict}
          onUnavailable={unavailable}
        />
      )}

      <h2>History</h2>
      <ol className="history">
        {request.history.map((entry) => (
          <li key={entry.id}>
            <span>{`${EVENT_LABEL[entry.type]} by ${entry.actor.name} · ${formatDateTime(entry.createdAt)}`}</span>
            {entry.category && <p>{`Category: ${CATEGORY_LABEL[entry.category]}`}</p>}
            {entry.reason && <p className="multiline">{entry.reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
