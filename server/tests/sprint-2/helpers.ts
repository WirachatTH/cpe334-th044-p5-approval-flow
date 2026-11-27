import { expect } from "vitest";
import pg from "pg";
import { freshUser, signedIn, type TestApp } from "../sprint-1/helpers/app.js";

// Shared steps for the F-06 tests. Every test makes its own users and requests.

export type Agent = Awaited<ReturnType<typeof signedIn>>;

export const VALUES = {
  title: "Oscilloscope for the electronics lab",
  description: "Replace the broken unit in room 401.",
  amount: "18500.00",
};
export const COMMENT = "Please add the model number.";

export const RETURNED_MESSAGE = "This request was returned to the requester for changes.";
export const DECIDED_MESSAGE = "This request has already been decided.";
export const NOT_RETURNED_MESSAGE = "Only a returned request can be resubmitted.";
export const STALE_MESSAGE = "This request was changed after you opened it. Check it again.";

export const decide = (agent: Agent, id: number | string, body: unknown) =>
  agent.post(`/api/requests/${id}/decision`).send(body as object);
export const sendReturn = (agent: Agent, id: number | string, body: unknown = { comment: COMMENT }) =>
  agent.post(`/api/requests/${id}/return`).send(body as object);
export const resubmit = (agent: Agent, id: number | string, body: unknown = VALUES) =>
  agent.post(`/api/requests/${id}/resubmission`).send(body as object);

export async function submit(agent: Agent, assignedReviewerId: number) {
  const res = await agent.post("/api/requests").send({ ...VALUES, assignedReviewerId });
  expect(res.status, `submitting a request: ${res.text}`).toBe(201);
  return res.body.request as { id: number; requestNumber: string };
}

// A requester, the reviewer the request is assigned to, and another reviewer, with a SUBMITTED request.
export async function scenario(t: TestApp) {
  const [requester, reviewer, other] = await Promise.all([
    freshUser(t, "REQUESTER", "ploy"),
    freshUser(t, "REVIEWER", "mint"),
    freshUser(t, "REVIEWER", "korn"),
  ]);
  const requesterAgent = await signedIn(t, requester.email);
  const reviewerAgent = await signedIn(t, reviewer.email);
  const otherAgent = await signedIn(t, other.email);
  const request = await submit(requesterAgent, reviewer.id);
  return { requester, reviewer, other, requesterAgent, reviewerAgent, otherAgent, request };
}

// The same, with the request returned to its requester.
export async function returnedScenario(t: TestApp) {
  const s = await scenario(t);
  const res = await sendReturn(s.reviewerAgent, s.request.id);
  expect(res.status, `returning the request: ${res.text}`).toBe(200);
  return s;
}

export const row = (t: TestApp, id: number) => t.prisma.approvalRequest.findUniqueOrThrow({ where: { id } });
export const events = (t: TestApp, requestId: number) =>
  t.prisma.requestEvent.findMany({ where: { requestId }, orderBy: { id: "asc" } });

// Everything a refused call must leave as it was.
export const snapshot = async (t: TestApp, id: number) => ({ request: await row(t, id), history: await events(t, id) });

// A pg connection on the throwaway schema of the test app, for the statements Prisma cannot express.
export async function sqlClient(t: TestApp): Promise<pg.Client> {
  const url = new URL(t.config.databaseUrl);
  const schema = url.searchParams.get("schema")!;
  url.searchParams.delete("schema");
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  await client.query(`SET search_path TO "${schema}"`);
  return client;
}
