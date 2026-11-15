import { useRef, useState } from "react";
import { useApi } from "../context/AuthContext.js";
import type { RequestDetail } from "../format.js";

// The decision panel on Request Detail (F-04 contract §2.1). The caller shows it only to the assigned reviewer of a
// SUBMITTED request; the API checks the same thing again, so hiding it is a convenience and not the rule.

const REASON_MAX = 1000;
const REASON_ID = "decision-reason";
const ERROR_ID = "decision-reason-error";

type Choice = "APPROVE" | "REJECT";

// The same reason rules as the API: only the trimmed text counts, a rejection needs one, and 1000 is the limit.
function reasonProblem(choice: Choice, reason: string): string | null {
  if (reason === "" && choice === "REJECT") return "Enter a reason to reject this request.";
  if ([...reason].length > REASON_MAX) return "Reason must be 1,000 characters or fewer.";
  return null;
}

interface Props {
  requestId: number;
  // The request after the decision, from the API's answer.
  onDecided: (request: RequestDetail, choice: Choice) => void;
  // Someone else decided first (409): the caller loads the request again.
  onConflict: () => void;
  // 403 or 404: the request is not available to this user.
  onUnavailable: () => void;
}

export function DecisionPanel({ requestId, onDecided, onConflict, onUnavailable }: Props) {
  const api = useApi();
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<Choice | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const trimmed = reason.trim();

  async function decide(choice: Choice) {
    if (busy) return;
    setFailure(null);

    const found = reasonProblem(choice, trimmed);
    setProblem(found);
    if (found) return field.current?.focus();

    setBusy(choice);
    try {
      const res = await api(`/api/requests/${requestId}/decision`, {
        method: "POST",
        body: JSON.stringify(trimmed === "" ? { decision: choice } : { decision: choice, reason: trimmed }),
      });
      if (res.ok) return onDecided((await res.json()).request, choice);
      if (res.status === 409) return onConflict();
      if (res.status === 403 || res.status === 404) return onUnavailable();
      const data = await res.json().catch(() => null);
      if (res.status === 400 && typeof data?.error?.fields?.reason === "string") {
        setProblem(data.error.fields.reason);
        field.current?.focus();
      } else {
        setFailure("Something went wrong. Please try again.");
      }
    } catch {
      setFailure("Something went wrong. Please try again.");
    }
    setBusy(null);
  }

  return (
    <section aria-labelledby="decision-panel-title" className="decision-panel">
      <h2 id="decision-panel-title">Decision</h2>
      {failure && (
        <p role="alert" className="form-error">
          {failure}
        </p>
      )}
      <div className="field">
        <label htmlFor={REASON_ID}>Reason (required to reject)</label>
        <textarea
          id={REASON_ID}
          ref={field}
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? ERROR_ID : undefined}
        />
        <p className="hint">{`${[...trimmed].length} / ${REASON_MAX}`}</p>
        {problem && (
          <p id={ERROR_ID} className="field-error">
            {problem}
          </p>
        )}
      </div>
      <div className="actions">
        <button type="button" className="primary" disabled={busy !== null} onClick={() => void decide("APPROVE")}>
          {busy === "APPROVE" ? "Saving…" : "Approve"}
        </button>
        <button type="button" disabled={busy !== null} onClick={() => void decide("REJECT")}>
          {busy === "REJECT" ? "Saving…" : "Reject"}
        </button>
      </div>
    </section>
  );
}
