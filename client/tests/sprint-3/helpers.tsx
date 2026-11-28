import { screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import type { mockApi } from "../sprint-1/helpers.js";

// Shared steps for the F-08 screens.

export const LABELS = {
  q: "Search number or title",
  status: "Status",
  from: "Submitted from",
  to: "Submitted to",
  minAmount: "Minimum amount (THB)",
  maxAmount: "Maximum amount (THB)",
} as const;

export const NO_MATCH = "No requests match these filters.";

export const field = (name: keyof typeof LABELS) => screen.getByLabelText(LABELS[name]);

// The query of the address, so that a test can read the filters kept there.
export function AddressProbe() {
  return <div data-testid="query">{useLocation().search}</div>;
}

export const address = () => Object.fromEntries(new URLSearchParams(screen.getByTestId("query").textContent ?? ""));

// The query of every call to one list, in order. `mockApi` itself records the path without it.
export function queries(api: ReturnType<typeof mockApi>, path: string) {
  return api.fn.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((url) => url.pathname === path)
    .map((url) => Object.fromEntries(url.searchParams));
}
