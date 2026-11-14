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
