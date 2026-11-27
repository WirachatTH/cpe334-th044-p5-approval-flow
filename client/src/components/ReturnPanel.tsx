import { useRef, useState } from "react";
import { useApi } from "../context/AuthContext.js";
import type { RequestDetail } from "../format.js";

// The return panel on Request Detail (F-06 contract §2.1). The caller shows it only to the assigned reviewer of a
// SUBMITTED request; the API checks the same thing again.

const COMMENT_MAX = 1000;
const FIELD_ID = "return-comment";
const ERROR_ID = "return-comment-error";
const FAILURE = "Something went wrong. Please try again.";

interface Props {
  requestId: number;
  // Sent with the action when the request has been resubmitted (F-06 contract §1.4).
  revision: number;
  onReturned: (request: RequestDetail) => void;
  // 409: the caller shows the message and loads the request again.
  onConflict: (message: string) => void;
  // 403 or 404: the request is not available to this user.
  onUnavailable: () => void;
}

export function ReturnPanel({ requestId, revision, onReturned, onConflict, onUnavailable }: Props) {
  const api = useApi();
  const [comment, setComment] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const trimmed = comment.trim();

  function show(found: string) {
    setProblem(found);
    field.current?.focus();
  }

  async function send() {
    if (busy) return;
    setFailure(null);
    setProblem(null);
    if (trimmed === "") return show("Enter a comment to return this request.");
    if ([...trimmed].length > COMMENT_MAX) return show("Comment must be 1,000 characters or fewer.");

    setBusy(true);
    try {
      const res = await api(`/api/requests/${requestId}/return`, {
        method: "POST",
        body: JSON.stringify({ comment: trimmed, ...(revision > 0 ? { revision } : {}) }),
      });
      if (res.ok) return onReturned((await res.json()).request);
      if (res.status === 403 || res.status === 404) return onUnavailable();
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        // The panel stays when only the content changed, so it must be usable again.
        setBusy(false);
        return onConflict(data?.error?.message ?? FAILURE);
      }
      const refused = res.status === 400 ? data?.error?.fields?.comment : undefined;
      if (typeof refused === "string") show(refused);
      else setFailure(FAILURE);
    } catch {
      setFailure(FAILURE);
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="return-panel-title" className="decision-panel">
      <h2 id="return-panel-title">Return for changes</h2>
      {failure && (
        <p role="alert" className="form-error">
          {failure}
        </p>
      )}
      <div className="field">
        <label htmlFor={FIELD_ID}>Comment for the requester (required to return)</label>
        <textarea
          id={FIELD_ID}
          ref={field}
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? ERROR_ID : undefined}
        />
        <p className="hint">{`${[...trimmed].length} / ${COMMENT_MAX}`}</p>
        {problem && (
          <p id={ERROR_ID} className="field-error">
            {problem}
          </p>
        )}
      </div>
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void send()}>
          {busy ? "Saving…" : "Return for changes"}
        </button>
      </div>
    </section>
  );
}
