import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useApi } from "../context/AuthContext.js";
import type { RequestDetail } from "../format.js";
import { contentErrors, type ContentErrors, type ContentValues } from "../requestRules.js";

// The resubmit form on Request Detail (F-06 contract §2.1). The caller shows it only to the requester of a RETURNED
// request; the API checks the same thing again. The reviewer cannot be changed (BR-16).

const FAILURE = "Something went wrong. Please try again.";
const ORDER: Array<keyof ContentValues> = ["title", "description", "amount"];
const LABEL: Record<keyof ContentValues, string> = { title: "Title", description: "Description", amount: "Amount (THB)" };

interface Props {
  request: RequestDetail;
  onResubmitted: (request: RequestDetail) => void;
  // 409: the caller shows the message and loads the request again.
  onConflict: (message: string) => void;
  // 403 or 404: the request is not available to this user.
  onUnavailable: () => void;
}

export function ResubmitForm({ request, onResubmitted, onConflict, onUnavailable }: Props) {
  const api = useApi();
  const [values, setValues] = useState<ContentValues>({
    title: request.title,
    description: request.description,
    amount: request.amount,
  });
  const [errors, setErrors] = useState<ContentErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refs: Record<keyof ContentValues, RefObject<HTMLInputElement & HTMLTextAreaElement>> = {
    title: useRef(null),
    description: useRef(null),
    amount: useRef(null),
  };

  function show(found: ContentErrors) {
    setErrors(found);
    const first = ORDER.find((name) => found[name]);
    if (first) refs[first].current?.focus();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    const found = contentErrors(values);
    show(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const res = await api(`/api/requests/${request.id}/resubmission`, {
        method: "POST",
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description.trim(),
          amount: values.amount.trim(),
        }),
      });
      if (res.ok) return onResubmitted((await res.json()).request);
      if (res.status === 403 || res.status === 404) return onUnavailable();
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        setBusy(false);
        return onConflict(data?.error?.message ?? FAILURE);
      }
      if (res.status === 400 && data?.error?.fields) show(data.error.fields);
      else setFailure(FAILURE);
    } catch {
      setFailure(FAILURE);
    }
    setBusy(false);
  }

  const field = (name: keyof ContentValues) => ({
    id: `resubmit-${name}`,
    ref: refs[name],
    value: values[name],
    onChange: (event: { target: { value: string } }) => setValues((v) => ({ ...v, [name]: event.target.value })),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `resubmit-${name}-error` : undefined,
  });

  return (
    <section aria-labelledby="resubmit-title-heading" className="decision-panel">
      <h2 id="resubmit-title-heading">Edit and resubmit</h2>
      {failure && (
        <p role="alert" className="form-error">
          {failure}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="request-form">
        {ORDER.map((name) => (
          <div key={name} className="field">
            <label htmlFor={`resubmit-${name}`}>{LABEL[name]}</label>
            {name === "description" ? (
              <textarea rows={5} {...field(name)} />
            ) : (
              <input type="text" inputMode={name === "amount" ? "decimal" : undefined} {...field(name)} />
            )}
            {errors[name] && (
              <p id={`resubmit-${name}-error`} className="field-error">
                {errors[name]}
              </p>
            )}
          </div>
        ))}
        <p>{`Reviewer: ${request.assignedReviewer.name} (cannot be changed)`}</p>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Resubmit"}
        </button>
      </form>
    </section>
  );
}
