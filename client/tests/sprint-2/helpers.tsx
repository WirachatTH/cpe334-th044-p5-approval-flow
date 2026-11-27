import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DECIDED_AT, MINT, PLOY, REVIEWERS, mockApi, renderApp, requestDetail, type Handler,
} from "../sprint-1/helpers.js";

// Fixtures and steps for the F-06 screens.

export const COMMENT = "Please add the model number.";
export const COMMENT_LABEL = "Comment for the requester (required to return)";

const PLOY_REF = { id: PLOY.id, name: PLOY.name };

// A request that the reviewer with id 3 (Mint) has returned.
export function returnedDetail(overrides: Record<string, unknown> = {}) {
  return requestDetail({
    status: "RETURNED",
    decidedBy: REVIEWERS[0],
    decisionReason: COMMENT,
    decidedAt: DECIDED_AT,
    history: [
      ...requestDetail().history,
      {
        id: 32, type: "RETURNED", fromStatus: "SUBMITTED", toStatus: "RETURNED", actor: REVIEWERS[0],
        reason: COMMENT, category: null, createdAt: DECIDED_AT,
      },
    ],
    ...overrides,
  });
}

// The same request after Ploy has resubmitted it.
export function resubmittedDetail(overrides: Record<string, unknown> = {}) {
  return requestDetail({
    revision: 1,
    history: [
      ...returnedDetail().history,
      {
        id: 33, type: "RESUBMITTED", fromStatus: "RETURNED", toStatus: "SUBMITTED", actor: PLOY_REF,
        reason: null, category: null, createdAt: DECIDED_AT,
      },
    ],
    ...overrides,
  });
}

export const ok = (request: unknown) => ({ status: 200, body: { request } });

export const failure = (status: number, code: string, message: string, fields?: Record<string, string>) => ({
  status,
  body: { error: { code, message, ...(fields ? { fields } : {}) } },
});

// Request Detail of request 12 as the given user. `routes` adds the answers of the POSTs.
export async function openDetail(
  me: typeof MINT | typeof PLOY,
  detail: Handler | Handler[],
  routes: Record<string, Handler | Handler[]> = {},
) {
  const api = mockApi({
    "GET /api/auth/me": { status: 200, body: { user: me } },
    "GET /api/requests/12": detail,
    ...routes,
  });
  renderApp("/requests/12");
  await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
  return {
    api,
    typing: userEvent.setup(),
    posts: () => api.calls.filter((c) => c.method === "POST"),
    loads: () => api.calls.filter((c) => c.method === "GET" && c.path === "/api/requests/12"),
  };
}

export const returnPanel = () => screen.queryByRole("region", { name: "Return for changes" });
export const resubmitForm = () => screen.queryByRole("region", { name: "Edit and resubmit" });
export const decisionPanel = () => screen.queryByRole("region", { name: "Decision" });
