import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { vi } from "vitest";
import { AppRoutes } from "../../src/AppRoutes.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

// Shared test helpers: a fake API behind fetch, and the app rendered at a given path.

export const PLOY = { id: 1, name: "Ploy Srisawat", email: "ploy.requester@example.com", role: "REQUESTER" } as const;
export const MINT = { id: 3, name: "Mint Chaiyaporn", email: "mint.reviewer@example.com", role: "REVIEWER" } as const;
export const PASSWORD = "Synthetic-Pass-A1";

export const REVIEWERS = [
  { id: 3, name: "Mint Chaiyaporn" },
  { id: 4, name: "Korn Thanakit" },
];

// 14 Nov 2026 09:05 UTC is 16:05 in Asia/Bangkok, the zone every date is shown in.
export const CREATED = "2026-11-14T09:05:00.000Z";

export function requestSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    requestNumber: "REQ-000012",
    title: "Oscilloscope for the electronics lab",
    amount: "18500.00",
    status: "SUBMITTED",
    assignedReviewer: REVIEWERS[0],
    createdAt: CREATED,
    ...overrides,
  };
}

export function requestDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...requestSummary(),
    description: "Replace the broken unit in room 401.",
    requester: { id: 1, name: "Ploy Srisawat" },
    decidedBy: null,
    decisionCategory: null,
    decisionReason: null,
    decidedAt: null,
    updatedAt: CREATED,
    history: [
      {
        id: 31,
        type: "SUBMITTED",
        fromStatus: null,
        toStatus: "SUBMITTED",
        actor: { id: 1, name: "Ploy Srisawat" },
        reason: null,
        category: null,
        createdAt: CREATED,
      },
    ],
    ...overrides,
  };
}

export function inboxItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    requestNumber: "REQ-000005",
    title: "Projector bulbs",
    amount: "1250.50",
    requester: { id: 1, name: "Ploy Srisawat" },
    createdAt: CREATED,
    ...overrides,
  };
}

// 14 Nov 2026 10:00 UTC is 17:00 in Asia/Bangkok.
export const DECIDED_AT = "2026-11-14T10:00:00.000Z";

// A request that the reviewer with id 3 (Mint) has decided.
export function decidedDetail(
  status: "APPROVED" | "REJECTED",
  reason: string | null = null,
  category: string | null = null,
) {
  return requestDetail({
    status,
    decidedBy: REVIEWERS[0],
    decisionCategory: category,
    decisionReason: reason,
    decidedAt: DECIDED_AT,
    history: [
      ...requestDetail().history,
      {
        id: 32,
        type: status,
        fromStatus: "SUBMITTED",
        toStatus: status,
        actor: REVIEWERS[0],
        reason,
        category,
        createdAt: DECIDED_AT,
      },
    ],
  });
}

export const UNAUTHENTICATED = { error: { code: "UNAUTHENTICATED", message: "Please sign in." } };

export interface Reply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}
export type Handler = Reply | ((init?: RequestInit) => Reply | Promise<Reply>);

export interface ApiCall {
  method: string;
  path: string;
  body?: unknown;
}

// Replaces fetch. Each route is "METHOD /path". A list answers its entries in order and then repeats the last one.
export function mockApi(routes: Record<string, Handler | Handler[]>) {
  const calls: ApiCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), "http://localhost").pathname;
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });

    let handler = routes[`${method} ${path}`];
    if (Array.isArray(handler)) handler = handler.length > 1 ? handler.shift()! : handler[0];
    if (handler === undefined) {
      return respond({ status: 404, body: { error: { code: "NOT_FOUND", message: "Not found." } } });
    }
    return respond(typeof handler === "function" ? await handler(init) : handler);
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

function respond({ status, body, headers }: Reply): Response {
  return new Response(status === 204 || body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

export function renderApp(path: string, extra?: ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
        {extra}
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  );
}

export const currentPath = () => screen.getByTestId("location").textContent;
