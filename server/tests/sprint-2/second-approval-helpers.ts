import { expect } from "vitest";
import { freshUser, signedIn, type TestApp } from "../sprint-1/helpers/app.js";
import { VALUES, decide, type Agent } from "./helpers.js";

// Shared steps for the F-07 tests. Every test makes its own users and requests. Other tests' reviewers are also
// eligible second reviewers, so the tests look for their own requests and never assume a list is otherwise empty.

export const HIGH = "250000.00";
export const SAME_APPROVER_MESSAGE = "A different reviewer must give the second approval.";
export const WAITING_MESSAGE = "This request is waiting for a second approval.";
export const REJECTION = { decision: "REJECT", reason: "Already ordered last week.", category: "DUPLICATE" };

export async function submitAmount(agent: Agent, assignedReviewerId: number, amount: string) {
  const res = await agent.post("/api/requests").send({ ...VALUES, amount, assignedReviewerId });
  expect(res.status, `submitting a request of ${amount}: ${res.text}`).toBe(201);
  return res.body.request as { id: number; requestNumber: string };
}

// A requester, the assigned reviewer (first), another reviewer (second), and a SUBMITTED request.
export async function highScenario(t: TestApp, amount = HIGH) {
  const [requester, first, second] = await Promise.all([
    freshUser(t, "REQUESTER", "ploy"),
    freshUser(t, "REVIEWER", "mint"),
    freshUser(t, "REVIEWER", "anan"),
  ]);
  const requesterAgent = await signedIn(t, requester.email);
  const firstAgent = await signedIn(t, first.email);
  const secondAgent = await signedIn(t, second.email);
  const request = await submitAmount(requesterAgent, first.id, amount);
  return { requester, first, second, requesterAgent, firstAgent, secondAgent, request };
}

// The same, after the assigned reviewer's approval: the request waits for the second one.
export async function waitingScenario(t: TestApp, amount = HIGH) {
  const s = await highScenario(t, amount);
  const res = await decide(s.firstAgent, s.request.id, { decision: "APPROVE" });
  expect(res.status, `the first approval: ${res.text}`).toBe(200);
  return s;
}

export async function anotherReviewer(t: TestApp, label = "korn") {
  const user = await freshUser(t, "REVIEWER", label);
  return { user, agent: await signedIn(t, user.email) };
}
