import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshUser, signedIn, startTestApp, type TestApp } from "./helpers/app.js";

// F-04: the review inbox and the decision, against a real database (contract §3, AC-F04-01 to 11, 13, 21 to 23).
// Every test uses accounts it creates itself, so one test's requests never appear in another test's inbox.

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

type Agent = Awaited<ReturnType<typeof signedIn>>;

// A requester, the reviewer the request is assigned to, and another reviewer, with a SUBMITTED request.
async function scenario() {
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

async function submit(agent: Agent, assignedReviewerId: number, title = "Oscilloscope for the electronics lab") {
  const res = await agent
    .post("/api/requests")
    .send({ title, description: "Replace the broken unit in room 401.", amount: "18500.00", assignedReviewerId });
  expect(res.status, `submitting a request: ${res.text}`).toBe(201);
  return res.body.request as { id: number; requestNumber: string };
}

const decide = (agent: Agent, id: number | string, body: unknown) => agent.post(`/api/requests/${id}/decision`).send(body as object);
const events = (requestId: number) => t.prisma.requestEvent.findMany({ where: { requestId }, orderBy: { id: "asc" } });
const row = (id: number) => t.prisma.approvalRequest.findUniqueOrThrow({ where: { id } });
const DECISION_FIELDS = ["status", "decidedById", "decidedAt", "decisionReason"] as const;
const decisionOf = async (id: number) => {
  const r = await row(id);
  return DECISION_FIELDS.map((f) => r[f]);
};

describe("the review inbox", () => {
  it("TEST-F04-01 / AC-F04-01: the inbox lists only my SUBMITTED requests, oldest first", async () => {
    const [requester, reviewer, other] = await Promise.all([
      freshUser(t, "REQUESTER", "q"),
      freshUser(t, "REVIEWER", "r"),
      freshUser(t, "REVIEWER", "k"),
    ]);
    const requesterAgent = await signedIn(t, requester.email);
    const first = await submit(requesterAgent, reviewer.id, "First");
    const second = await submit(requesterAgent, reviewer.id, "Second");
    const decided = await submit(requesterAgent, reviewer.id, "Already decided");
    await t.prisma.approvalRequest.update({
      where: { id: decided.id },
      data: { status: "APPROVED", decidedById: reviewer.id, decidedAt: new Date() },
    });
    await submit(requesterAgent, other.id, "For the other reviewer");

    const res = await (await signedIn(t, reviewer.email)).get("/api/reviews/inbox");
    expect(res.status, res.text).toBe(200);
    expect(res.body.requests.map((r: { id: number }) => r.id)).toEqual([first.id, second.id]);
    for (const item of res.body.requests) {
      expect(Object.keys(item).sort()).toEqual(["amount", "createdAt", "id", "requestNumber", "requester", "title"]);
      expect(item.requester).toEqual({ id: requester.id, name: requester.name });
    }
  });

  it("TEST-F04-02 / AC-F04-02: with nothing assigned the inbox is an empty list", async () => {
    const reviewer = await freshUser(t, "REVIEWER", "idle");
    const res = await (await signedIn(t, reviewer.email)).get("/api/reviews/inbox");
    expect(res.status, res.text).toBe(200);
    expect(res.body).toEqual({ requests: [] });
  });

  it("TEST-F04-23 / AC-F04-23: a request I submitted is not in my inbox, but is in its reviewer's", async () => {
    const [submitter, assigned] = await Promise.all([freshUser(t, "REVIEWER", "mint"), freshUser(t, "REVIEWER", "korn")]);
    const request = await submit(await signedIn(t, submitter.email), assigned.id);

    const mine = await (await signedIn(t, submitter.email)).get("/api/reviews/inbox");
    const theirs = await (await signedIn(t, assigned.email)).get("/api/reviews/inbox");
    expect(mine.status, mine.text).toBe(200);
    expect(mine.body.requests.map((r: { id: number }) => r.id)).not.toContain(request.id);
    expect(theirs.body.requests.map((r: { id: number }) => r.id)).toContain(request.id);
  });
});

describe("deciding a request", () => {
  it("TEST-F04-03 / AC-F04-03: approving without a reason records the decision and one history entry", async () => {
    const s = await scenario();
    const res = await decide(s.reviewerAgent, s.request.id, { decision: "APPROVE" });

    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({ status: "APPROVED", decidedBy: { id: s.reviewer.id }, decisionReason: null });
    expect(res.body.request.decidedAt).toEqual(expect.any(String));

    const history = await events(s.request.id);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      type: "APPROVED",
      fromStatus: "SUBMITTED",
      toStatus: "APPROVED",
      actorId: s.reviewer.id,
      reason: null,
    });
  });

  it("TEST-F04-04 / AC-F04-04: an approval reason is trimmed and stored on the request and the event", async () => {
    const s = await scenario();
    const res = await decide(s.reviewerAgent, s.request.id, { decision: "APPROVE", reason: "  Within budget  " });
    expect(res.status, res.text).toBe(200);
    expect((await row(s.request.id)).decisionReason).toBe("Within budget");
    expect((await events(s.request.id))[1].reason).toBe("Within budget");
  });

  it("TEST-F04-05 / AC-F04-05: rejecting with a reason stores it on the request and the event", async () => {
    const s = await scenario();
    const reason = "Please get a second quotation.";
    const res = await decide(s.reviewerAgent, s.request.id, { decision: "REJECT", reason });
    expect(res.status, res.text).toBe(200);
    expect(res.body.request.status).toBe("REJECTED");
    expect((await row(s.request.id)).decisionReason).toBe(reason);
    expect((await events(s.request.id))[1]).toMatchObject({ type: "REJECTED", reason });
  });

  it("TEST-F04-06 / AC-F04-06: a rejection needs a reason of 1 to 1000 characters", async () => {
    const s = await scenario();
    const REQUIRED = "Enter a reason to reject this request.";
    const invalid: Array<[string, unknown, string]> = [
      ["a missing reason", undefined, REQUIRED],
      ["a null reason", null, REQUIRED],
      ["an empty reason", "", REQUIRED],
      ["a blank reason", "   ", REQUIRED],
      ["a 1001-character reason", "x".repeat(1001), "Reason must be 1,000 characters or fewer."],
    ];
    for (const [label, reason, message] of invalid) {
      const request = await submit(s.requesterAgent, s.reviewer.id);
      const res = await decide(s.reviewerAgent, request.id, { decision: "REJECT", reason });
      expect(res.status, label).toBe(400);
      expect(res.body.error?.fields, label).toEqual({ reason: message });
      expect((await row(request.id)).status, label).toBe("SUBMITTED");
      expect(await events(request.id), label).toHaveLength(1);
    }

    const exact = await submit(s.requesterAgent, s.reviewer.id);
    const ok = await decide(s.reviewerAgent, exact.id, { decision: "REJECT", reason: "x".repeat(1000) });
    expect(ok.status, "exactly 1000 characters is accepted").toBe(200);

    const approval = await submit(s.requesterAgent, s.reviewer.id);
    const tooLong = await decide(s.reviewerAgent, approval.id, { decision: "APPROVE", reason: "x".repeat(1001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error?.fields).toEqual({ reason: "Reason must be 1,000 characters or fewer." });
    expect((await row(approval.id)).status).toBe("SUBMITTED");
  });

  it.each([
    ["a missing decision", undefined],
    ["a lower-case decision", "approve"],
    ["an unknown decision", "RETURN"],
    ["a number", 1],
  ])("TEST-F04-07 / AC-F04-07: %s is refused", async (_label, decision) => {
    const s = await scenario();
    const res = await decide(s.reviewerAgent, s.request.id, { decision });
    expect(res.status, res.text).toBe(400);
    expect(res.body.error?.fields).toEqual({ decision: "Choose approve or reject." });
    expect((await row(s.request.id)).status).toBe("SUBMITTED");
    expect(await events(s.request.id)).toHaveLength(1);
  });

  it("TEST-F04-08 / AC-F04-08: a reviewer cannot decide a request they submitted, whatever the body", async () => {
    const [submitter, assigned] = await Promise.all([freshUser(t, "REVIEWER", "mint"), freshUser(t, "REVIEWER", "korn")]);
    const agent = await signedIn(t, submitter.email);
    const request = await submit(agent, assigned.id);
    const before = await decisionOf(request.id);

    for (const body of [{ decision: "APPROVE" }, {}]) {
      const res = await decide(agent, request.id, body);
      expect(res.status, JSON.stringify(body)).toBe(403);
      expect(res.body.error?.code).toBe("SELF_APPROVAL_FORBIDDEN");
    }
    expect(await decisionOf(request.id)).toEqual(before);
    expect(await events(request.id)).toHaveLength(1);
  });

  it("TEST-F04-09 / AC-F04-09: a reviewer the request is not assigned to gets the same 404 as for a missing request", async () => {
    const s = await scenario();
    const before = await decisionOf(s.request.id);
    const unrelated = await decide(s.otherAgent, s.request.id, { decision: "APPROVE" });
    const missing = await decide(s.otherAgent, 999999, { decision: "APPROVE" });

    for (const res of [unrelated, missing]) {
      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
      expect(Object.keys(res.body)).toEqual(["error"]);
    }
    expect(unrelated.body).toEqual(missing.body);
    expect(await decisionOf(s.request.id)).toEqual(before);

    // The 404 is an ownership check on a request that exists, not a missing route: the assigned reviewer can decide it.
    const assigned = await decide(s.reviewerAgent, s.request.id, { decision: "APPROVE" });
    expect(assigned.status, assigned.text).toBe(200);
  });

  it("TEST-F04-10 / AC-F04-10: a requester cannot decide, not even their own request", async () => {
    const s = await scenario();
    const before = await decisionOf(s.request.id);
    const res = await decide(s.requesterAgent, s.request.id, { decision: "APPROVE" });
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
    expect(await decisionOf(s.request.id)).toEqual(before);
  });

  it("TEST-F04-11 / AC-F04-11: a decided request cannot be decided again", async () => {
    const s = await scenario();
    expect((await decide(s.reviewerAgent, s.request.id, { decision: "APPROVE" })).status).toBe(200);
    const decided = await decisionOf(s.request.id);

    for (const body of [{ decision: "APPROVE" }, { decision: "REJECT", reason: "Changed my mind." }]) {
      const res = await decide(s.reviewerAgent, s.request.id, body);
      expect(res.status, JSON.stringify(body)).toBe(409);
      expect(res.body.error?.code).toBe("INVALID_TRANSITION");
    }
    expect(await events(s.request.id)).toHaveLength(2);
    expect(await decisionOf(s.request.id)).toEqual(decided);
  });

  it("TEST-F04-21 / AC-F04-21: a reason that is not a string is refused", async () => {
    const s = await scenario();
    const cases: Array<[unknown, unknown]> = [
      ["REJECT", 123],
      ["APPROVE", { text: "ok" }],
    ];
    for (const [decision, reason] of cases) {
      const res = await decide(s.reviewerAgent, s.request.id, { decision, reason });
      expect(res.status, `${decision} with ${JSON.stringify(reason)}`).toBe(400);
      expect(res.body.error?.fields).toEqual({ reason: "Enter the reason as text." });
    }
    expect((await row(s.request.id)).status).toBe("SUBMITTED");
    expect(await events(s.request.id)).toHaveLength(1);
  });

  it("TEST-F04-22 / AC-F04-22: spaces around a 1000-character reason are not counted or stored", async () => {
    const s = await scenario();
    const reason = "x".repeat(1000);
    const res = await decide(s.reviewerAgent, s.request.id, { decision: "REJECT", reason: `  ${reason}  ` });
    expect(res.status, res.text).toBe(200);
    expect((await row(s.request.id)).decisionReason).toBe(reason);
    expect((await events(s.request.id))[1].reason).toBe(reason);
  });
});

describe("after a decision", () => {
  it("TEST-F04-13 / AC-F04-13: the requester sees the decision, the reason, and the history", async () => {
    const s = await scenario();
    const reason = "Please get a second quotation.";
    expect((await decide(s.reviewerAgent, s.request.id, { decision: "REJECT", reason })).status).toBe(200);

    const detail = await s.requesterAgent.get(`/api/requests/${s.request.id}`);
    expect(detail.status, detail.text).toBe(200);
    expect(detail.body.request).toMatchObject({
      status: "REJECTED",
      decidedBy: { id: s.reviewer.id },
      decisionReason: reason,
    });
    expect(detail.body.request.history.map((h: { type: string }) => h.type)).toEqual(["SUBMITTED", "REJECTED"]);

    const mine = await s.requesterAgent.get("/api/requests/mine");
    expect(mine.body.requests.find((r: { id: number }) => r.id === s.request.id)?.status).toBe("REJECTED");
  });
});
