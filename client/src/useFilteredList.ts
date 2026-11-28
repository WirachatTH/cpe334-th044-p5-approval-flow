import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useApi } from "./context/AuthContext.js";
import { FILTER_NAMES, filtersOf, hasFilters, type FilterErrors, type FilterValues } from "./filterRules.js";

// A list with filters that live in the address (F-08 contract §1.2), so a reload or a copied link shows the same list.
// The query of the address is sent to the API as it is; the API ignores what it does not know.

export type ListState<T> =
  | { kind: "loading" }
  | { kind: "error" }
  // A 400: the API names the fields that are wrong.
  | { kind: "refused"; fields: FilterErrors }
  | { kind: "ready"; requests: T[] };

export function useFilteredList<T>(path: string) {
  const api = useApi();
  const { search } = useLocation();
  const [, setParams] = useSearchParams();
  const [state, setState] = useState<ListState<T>>({ kind: "loading" });
  // Only the answer to the latest call counts: an older one must not replace a newer list.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const call = ++latest.current;
    setState({ kind: "loading" });
    try {
      const res = await api(`${path}${search}`);
      const body = res.ok || res.status === 400 ? await res.json() : null;
      if (call !== latest.current) return;
      if (res.ok) return setState({ kind: "ready", requests: body.requests });
      if (res.status === 400 && body?.error?.fields) return setState({ kind: "refused", fields: body.error.fields });
      setState({ kind: "error" });
    } catch {
      if (call === latest.current) setState({ kind: "error" });
    }
  }, [api, path, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const applied = useMemo(() => filtersOf(new URLSearchParams(search)), [search]);

  const apply = (values: FilterValues) => {
    const next = new URLSearchParams();
    for (const name of FILTER_NAMES) if (values[name] !== "") next.set(name, values[name]);
    setParams(next);
  };
  const clear = () => {
    const next = new URLSearchParams(search);
    for (const name of FILTER_NAMES) next.delete(name);
    setParams(next);
  };

  return {
    state,
    reload: load,
    filtered: hasFilters(applied),
    bar: { applied, refused: state.kind === "refused" ? state.fields : null, onApply: apply, onClear: clear },
  };
}
