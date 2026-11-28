import type { RequestStatus } from "@prisma/client";
import { expect } from "vitest";
import { freshUser, signedIn, type TestApp } from "../sprint-1/helpers/app.js";

// Shared steps for the F-08 tests. A request is written straight to the table, so that its date, amount, and state
// are the ones the test needs. Every test makes its own users.

export type Agent = Awaited<ReturnType<typeof signedIn>>;

export const WHEN = "2026-11-10T03:00:00.000Z";

export interface Row {
  requesterId: number;
  reviewerId: number;
  title?: string;
  amount?: string;
  createdAt?: string;
  status?: RequestStatus;
  // Who gave the first of two approvals, for a waiting request (default: the assigned reviewer).
  firstApproverId?: number;
}

export function makeRequest(t: TestApp, row: Row) {
  const status = row.status ?? "SUBMITTED";
  const at = new Date(row.createdAt ?? WHEN);
  const waiting = status === "AWAITING_SECOND_APPROVAL";
  const first = waiting ? (row.firstApproverId ?? row.reviewerId) : null;
  const decider = status === "SUBMITTED" ? null : (first ?? row.reviewerId);
  const reason = status === "REJECTED" ? "Already ordered last week." : status === "RETURNED" ? "Add the model." : null;
  return t.prisma.approvalRequest.create({
    data: {
      requesterId: row.requesterId,
      assignedReviewerId: row.reviewerId,
      title: row.title ?? "Filter test request",
      description: "Made by a filter test.",
      amount: row.amount ?? "100.00",
      status,
      createdAt: at,
      decidedById: decider,
      decidedAt: decider === null ? null : at,
      decisionReason: reason,
      firstApprovedById: first,
      firstApprovedAt: first === null ? null : at,
    },
  });
}

export async function person(t: TestApp, role: "REQUESTER" | "REVIEWER", label: string) {
  const user = await freshUser(t, role, label);
  return { user, agent: await signedIn(t, user.email) };
}

export const MINE = "/api/requests/mine";
export const INBOX = "/api/reviews/inbox";

// The titles of a list, in the order given. `query` is a query string without the question mark.
export async function titles(agent: Agent, path: string, query = "") {
  const res = await agent.get(query === "" ? path : `${path}?${query}`);
  expect(res.status, `${path}?${query}: ${res.text}`).toBe(200);
  return (res.body.requests as { title: string }[]).map((request) => request.title);
}

export const search = (values: Record<string, string>) => new URLSearchParams(values).toString();
