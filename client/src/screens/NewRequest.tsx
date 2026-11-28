import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../context/AuthContext.js";
import type { PersonRef } from "../format.js";
import { contentErrors } from "../requestRules.js";

// New Request (F-03 contract §2.1): loads the reviewers, checks the same rules as the API for quick feedback, and
// posts. Nothing is sent while a field is invalid, and the typed values are kept on every failure.

type Field = "title" | "description" | "amount" | "assignedReviewerId";
type Errors = Partial<Record<Field, string>>;
const ORDER: Field[] = ["title", "description", "amount", "assignedReviewerId"];

interface Values {
  title: string;
  description: string;
  amount: string;
  assignedReviewerId: string;
}

function validate(values: Values): Errors {
  const errors: Errors = contentErrors(values);
  if (values.assignedReviewerId === "") errors.assignedReviewerId = "Choose a reviewer.";
  return errors;
}

function FieldShell({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function NewRequest() {
  const api = useApi();
  const navigate = useNavigate();
  const [reviewers, setReviewers] = useState<PersonRef[] | "loading" | "error">("loading");
  const [values, setValues] = useState<Values>({ title: "", description: "", amount: "", assignedReviewerId: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refs: Record<Field, RefObject<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>> = {
    title: useRef(null),
    description: useRef(null),
    amount: useRef(null),
    assignedReviewerId: useRef(null),
  };

  const loadReviewers = useCallback(async () => {
    setReviewers("loading");
    try {
      const res = await api("/api/reviewers");
      setReviewers(res.ok ? (await res.json()).reviewers : "error");
    } catch {
      setReviewers("error");
    }
  }, [api]);

  useEffect(() => {
    void loadReviewers();
  }, [loadReviewers]);

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));
  const describedBy = (field: Field) => (errors[field] ? `${field === "assignedReviewerId" ? "reviewer" : field}-error` : undefined);
  const focusFirst = (found: Errors) => {
    const first = ORDER.find((field) => found[field]);
    if (first) refs[first].current?.focus();
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirst(found);

    setBusy(true);
    try {
      const res = await api("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description.trim(),
          amount: values.amount.trim(),
          assignedReviewerId: Number(values.assignedReviewerId),
        }),
      });
      if (res.status === 201) {
        const { request } = await res.json();
        navigate(`/requests/${request.id}`, { state: { submitted: request.requestNumber } });
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.status === 400 && data?.error?.fields) {
        setErrors(data.error.fields);
        focusFirst(data.error.fields);
      } else {
        setFailure("Something went wrong. Please try again.");
      }
    } catch {
      setFailure("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (reviewers === "loading") {
    return (
      <div className="centered" role="status">
        <div className="spinner" aria-hidden="true" />
        <p>Loading reviewers…</p>
      </div>
    );
  }

  const none = reviewers !== "error" && reviewers.length === 0;
  return (
    <section>
      <h1>New Request</h1>
      {reviewers === "error" && (
        <p role="alert" className="form-error">
          Could not load the reviewers.{" "}
          <button type="button" onClick={() => void loadReviewers()}>
            Try again
          </button>
        </p>
      )}
      {none && <p>No reviewers are available right now.</p>}
      {failure && (
        <p role="alert" className="form-error">
          {failure}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="request-form">
        <FieldShell id="title" label="Title" error={errors.title}>
          <input
            id="title"
            ref={refs.title}
            type="text"
            value={values.title}
            onChange={set("title")}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={describedBy("title")}
          />
        </FieldShell>
        <FieldShell id="description" label="Description" error={errors.description}>
          <textarea
            id="description"
            ref={refs.description}
            rows={5}
            value={values.description}
            onChange={set("description")}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describedBy("description")}
          />
        </FieldShell>
        <FieldShell id="amount" label="Amount (THB)" error={errors.amount}>
          <input
            id="amount"
            ref={refs.amount}
            type="text"
            inputMode="decimal"
            value={values.amount}
            onChange={set("amount")}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={describedBy("amount")}
          />
        </FieldShell>
        <FieldShell id="reviewer" label="Reviewer" error={errors.assignedReviewerId}>
          <select
            id="reviewer"
            ref={refs.assignedReviewerId}
            value={values.assignedReviewerId}
            onChange={set("assignedReviewerId")}
            aria-invalid={errors.assignedReviewerId ? true : undefined}
            aria-describedby={describedBy("assignedReviewerId")}
          >
            <option value="">Choose a reviewer</option>
            {Array.isArray(reviewers) &&
              reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.name}
                </option>
              ))}
          </select>
        </FieldShell>
        <button type="submit" disabled={busy || none || reviewers === "error"}>
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </section>
  );
}
