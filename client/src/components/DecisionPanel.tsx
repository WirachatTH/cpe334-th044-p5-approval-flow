import { useRef, useState } from "react";
import { useApi } from "../context/AuthContext.js";
import { CATEGORY_LABEL, type RejectionCategory, type RequestDetail } from "../format.js";

// The decision panel on Request Detail (F-04 contract §2.1, changed by F-06). The caller shows it only to the assigned
// reviewer of a SUBMITTED request; the API checks the same thing again, so hiding it is a convenience and not the rule.

const REJECTION_REASON_MIN = 10;
const REASON_MAX = 1000;
const REASON_ID = "decision-reason";
const ERROR_ID = "decision-reason-error";
const CATEGORY_ID = "decision-category";
const CATEGORY_ERROR_ID = "decision-category-error";
const CATEGORIES = Object.keys(CATEGORY_LABEL) as RejectionCategory[];

type Choice = "APPROVE" | "REJECT";

interface Problems {
  reason: string | null;
  category: string | null;
}

const NO_PROBLEMS: Problems = { reason: null, category: null };

// The same reason rules as the API: only the trimmed text counts, in code points; a rejection needs at least 10
// characters, an approval has no minimum, and 1000 is the limit.
function reasonProblem(choice: Choice, reason: string): string | null {
  const length = [...reason].length;
  if (length === 0 && choice === "REJECT") return "Enter a reason to reject this request.";
  if (choice === "REJECT" && length < REJECTION_REASON_MIN) return "Reason must be at least 10 characters.";
  if (length > REASON_MAX) return "Reason must be 1,000 characters or fewer.";
  return null;
}

interface Props {
  requestId: number;
  // Sent with the decision when the request has been resubmitted (F-06 contract §1.4).
  revision: number;
  // The request after the decision, from the API's answer.
  onDecided: (request: RequestDetail, choice: Choice) => void;
  // 409, for example someone else acted first: the caller shows the message and loads the request again.
  onConflict: (message: string) => void;
  // 403 or 404: the request is not available to this user.
  onUnavailable: () => void;
}

export function DecisionPanel({ requestId, revision, onDecided, onConflict, onUnavailable }: Props) {
  const api = useApi();
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<Choice | null>(null);
  const reasonField = useRef<HTMLTextAreaElement>(null);
  const categoryField = useRef<HTMLSelectElement>(null);
  const trimmed = reason.trim();

  // Shows every problem at once and moves the focus to the first invalid field in form order.
  function show(found: Problems) {
    setProblems(found);
    if (found.reason) reasonField.current?.focus();
    else if (found.category) categoryField.current?.focus();
  }

  async function decide(choice: Choice) {
    if (busy) return;
    setFailure(null);

    const found: Problems = {
      reason: reasonProblem(choice, trimmed),
      category: choice === "REJECT" && category === "" ? "Choose a rejection category." : null,
    };
    show(found);
    if (found.reason || found.category) return;

    setBusy(choice);
    try {
      // An approval never carries a category, whatever the select holds.
      const res = await api(`/api/requests/${requestId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision: choice,
          ...(trimmed === "" ? {} : { reason: trimmed }),
          ...(choice === "REJECT" ? { category } : {}),
          ...(revision > 0 ? { revision } : {}),
        }),
      });
      if (res.ok) return onDecided((await res.json()).request, choice);
      if (res.status === 409) {
        const answer = await res.json().catch(() => null);
        // The panel stays when only the content changed, so it must be usable again.
        setBusy(null);
        return onConflict(answer?.error?.message ?? "Something went wrong. Please try again.");
      }
      if (res.status === 403) {
        const refusal = await res.json().catch(() => null);
        // The first approver, acting from a page loaded before their approval (F-07 contract §2.1).
        if (refusal?.error?.code !== "SAME_APPROVER_FORBIDDEN") return onUnavailable();
        setBusy(null);
        return onConflict(refusal.error.message);
      }
      if (res.status === 404) return onUnavailable();
      const data = await res.json().catch(() => null);
      const fields = res.status === 400 ? data?.error?.fields : undefined;
      const refused: Problems = {
        reason: typeof fields?.reason === "string" ? fields.reason : null,
        category: typeof fields?.category === "string" ? fields.category : null,
      };
      if (refused.reason || refused.category) show(refused);
      else setFailure("Something went wrong. Please try again.");
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
          ref={reasonField}
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={problems.reason ? true : undefined}
          aria-describedby={problems.reason ? ERROR_ID : undefined}
        />
        <p className="hint">{`${[...trimmed].length} / ${REASON_MAX}`}</p>
        {problems.reason && (
          <p id={ERROR_ID} className="field-error">
            {problems.reason}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={CATEGORY_ID}>Rejection category (required to reject)</label>
        <select
          id={CATEGORY_ID}
          ref={categoryField}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-invalid={problems.category ? true : undefined}
          aria-describedby={problems.category ? CATEGORY_ERROR_ID : undefined}
        >
          <option value="">Choose a category</option>
          {CATEGORIES.map((code) => (
            <option key={code} value={code}>
              {CATEGORY_LABEL[code]}
            </option>
          ))}
        </select>
        {problems.category && (
          <p id={CATEGORY_ERROR_ID} className="field-error">
            {problems.category}
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
