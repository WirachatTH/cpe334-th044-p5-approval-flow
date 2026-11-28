import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  FILTER_NAMES, NO_FILTERS, filterErrors, trimmed, type FilterErrors, type FilterName, type FilterValues,
} from "../filterRules.js";
import { STATUS_LABEL, type RequestStatus } from "../format.js";

// The filter bar above a list (F-08 contract §2.1). The fields show the filters of the address; applying checks them
// and hands them to the list, which puts them in the address.

interface Props {
  // The filters of the address.
  applied: FilterValues;
  // The statuses this list can hold.
  statuses: RequestStatus[];
  // The field messages of a 400 answer.
  refused: FilterErrors | null;
  onApply: (values: FilterValues) => void;
  onClear: () => void;
}

const TEXT_FIELDS: { name: Exclude<FilterName, "q" | "status">; label: string; placeholder?: string }[] = [
  { name: "from", label: "Submitted from", placeholder: "YYYY-MM-DD" },
  { name: "to", label: "Submitted to", placeholder: "YYYY-MM-DD" },
  { name: "minAmount", label: "Minimum amount (THB)" },
  { name: "maxAmount", label: "Maximum amount (THB)" },
];

const idOf = (name: FilterName) => `filter-${name}`;

export function FilterBar({ applied, statuses, refused, onApply, onClear }: Props) {
  const [draft, setDraft] = useState(applied);
  const [errors, setErrors] = useState<FilterErrors>({});
  const fields = useRef<Partial<Record<FilterName, HTMLInputElement | HTMLSelectElement | null>>>({});

  const focusFirst = useCallback((found: FilterErrors) => {
    const name = FILTER_NAMES.find((candidate) => found[candidate]);
    if (name) fields.current[name]?.focus();
  }, []);

  // A new address, for example from "Back" or "Clear filters", replaces what the fields hold.
  useEffect(() => {
    setDraft(applied);
    setErrors({});
  }, [applied]);

  useEffect(() => {
    if (!refused) return;
    setErrors(refused);
    focusFirst(refused);
  }, [refused, focusFirst]);

  function apply(event: FormEvent) {
    event.preventDefault();
    const values = trimmed(draft);
    const found = filterErrors(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirst(found);
    onApply(values);
  }

  function clear() {
    setDraft(NO_FILTERS);
    setErrors({});
    onClear();
  }

  const control = (name: FilterName) => ({
    id: idOf(name),
    value: draft[name],
    ref: (element: HTMLInputElement | HTMLSelectElement | null) => {
      fields.current[name] = element;
    },
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [name]: event.target.value })),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${idOf(name)}-error` : undefined,
  });
  const message = (name: FilterName) =>
    errors[name] && (
      <p id={`${idOf(name)}-error`} className="field-error">
        {errors[name]}
      </p>
    );

  return (
    <form className="filters" noValidate onSubmit={apply} aria-label="Filters">
      <div className="field">
        <label htmlFor={idOf("q")}>Search number or title</label>
        <input type="text" {...control("q")} />
        {message("q")}
      </div>
      <div className="field">
        <label htmlFor={idOf("status")}>Status</label>
        <select {...control("status")}>
          <option value="">All</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        {message("status")}
      </div>
      {TEXT_FIELDS.map(({ name, label, placeholder }) => (
        <div className="field" key={name}>
          <label htmlFor={idOf(name)}>{label}</label>
          <input type="text" placeholder={placeholder} inputMode={placeholder ? undefined : "decimal"} {...control(name)} />
          {message(name)}
        </div>
      ))}
      <div className="actions">
        <button type="submit" className="primary">
          Apply filters
        </button>
        <button type="button" onClick={clear}>
          Clear filters
        </button>
      </div>
    </form>
  );
}
