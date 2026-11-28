import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshUser, signedIn, startTestApp, type TestApp } from "./helpers/app.js";

// F-04: the review inbox and the decision, against a real database (contract §3, AC-F04-01 to 11, 13, 21 to 27, and
// 30 to 32).
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
      expect(Object.keys(item).sort()).toEqual(["amount", "createdAt", "id", "requestNumber", "requester", "status", "title"]);
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

    // One timestamp for the whole decision: the request's decision time is the new history entry's time.
    const decided = await row(s.request.id);
    expect(decided.decidedAt, "decided_at is set").not.toBeNull();
    expect(decided.decidedAt!.toISOString()).toBe(history[1].createdAt.toISOString());
    expect(res.body.request.decidedAt).toBe(decided.decidedAt!.toISOString());
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
    const res = await decide(s.reviewerAgent, s.request.id, { decision: "REJECT", reason, category: "INCOMPLETE" });
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
      const res = await decide(s.reviewerAgent, request.id, { decision: "REJECT", reason, category: "BUDGET" });
      expect(res.status, label).toBe(400);
      expect(res.body.error?.fields, label).toEqual({ reason: message });
      expect((await row(request.id)).status, label).toBe("SUBMITTED");
      expect(await events(request.id), label).toHaveLength(1);
    }

    const exact = await submit(s.requesterAgent, s.reviewer.id);
    const ok = await decide(s.reviewerAgent, exact.id, { decision: "REJECT", reason: "x".repeat(1000), category: "BUDGET" });
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

    for (const body of [{ decision: "APPROVE" }, { decision: "REJECT", reason: "Changed my mind.", category: "OTHER" }]) {
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
      const category = decision === "REJECT" ? "BUDGET" : undefined;
      const res = await decide(s.reviewerAgent, s.request.id, { decision, reason, category });
      expect(res.status, `${decision} with ${JSON.stringify(reason)}`).toBe(400);
      expect(res.body.error?.fields).toEqual({ reason: "Enter the reason as text." });
    }
    expect((await row(s.request.id)).status).toBe("SUBMITTED");
    expect(await events(s.request.id)).toHaveLength(1);
  });

  it("TEST-F04-22 / AC-F04-22: spaces around a 1000-character reason are not counted or stored", async () => {
    const s = await scenario();
    const reason = "x".repeat(1000);
    const body = { decision: "REJECT", reason: `  ${reason}  `, category: "BUDGET" };
    const res = await decide(s.reviewerAgent, s.request.id, body);
    expect(res.status, res.text).toBe(200);
    expect((await row(s.request.id)).decisionReason).toBe(reason);
    expect((await events(s.request.id))[1].reason).toBe(reason);
  });
});

describe("after a decision", () => {
  it("TEST-F04-13 / AC-F04-13: the requester sees the decision, the reason, and the history", async () => {
    const s = await scenario();
    const reason = "Please get a second quotation.";
    const rejection = { decision: "REJECT", reason, category: "INCOMPLETE" };
    expect((await decide(s.reviewerAgent, s.request.id, rejection)).status).toBe(200);

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

// Change request #65 (Lab 7): a rejection needs a category and a reason of at least 10 characters.
describe("rejection reason and category", () => {
  const TOO_SHORT = "Reason must be at least 10 characters.";
  const CHOOSE_CATEGORY = "Choose a rejection category.";
  const CATEGORIES = ["BUDGET", "INCOMPLETE", "DUPLICATE", "POLICY", "OTHER"] as const;

  const expectUndecided = async (id: number, label: string) => {
    expect((await row(id)).status, label).toBe("SUBMITTED");
    expect(await events(id), label).toHaveLength(1);
  };

  it("TEST-F04-24 / AC-F04-24: a rejection reason under 10 characters is refused, counted in code points", async () => {
    const s = await scenario();
    const approved = await submit(s.requesterAgent, s.reviewer.id);
    expect((await decide(s.reviewerAgent, approved.id, { decision: "APPROVE" })).status).toBe(200);
    const before = await row(approved.id);

    // Five emoji are 5 code points and 10 UTF-16 units.
    for (const reason of ["No", "123456789", "  123456789  ", "\u{1F600}".repeat(5)]) {
      const request = await submit(s.requesterAgent, s.reviewer.id);
      const res = await decide(s.reviewerAgent, request.id, { decision: "REJECT", reason, category: "BUDGET" });
      expect(res.status, JSON.stringify(reason)).toBe(400);
      expect(res.body.error?.fields, JSON.stringify(reason)).toEqual({ reason: TOO_SHORT });
      await expectUndecided(request.id, JSON.stringify(reason));
    }

    const again = await decide(s.reviewerAgent, approved.id, { decision: "REJECT", reason: "No", category: "BUDGET" });
    expect(again.status, again.text).toBe(400);
    expect(again.body.error?.fields).toEqual({ reason: TOO_SHORT });
    expect(await row(approved.id)).toEqual(before);
    expect(await events(approved.id)).toHaveLength(2);
  });

  it("TEST-F04-25 / AC-F04-25: ten characters after trimming are accepted and stored with the category", async () => {
    const s = await scenario();
    for (const reason of ["1234567890", "  1234567890  "]) {
      const request = await submit(s.requesterAgent, s.reviewer.id);
      const res = await decide(s.reviewerAgent, request.id, { decision: "REJECT", reason, category: "POLICY" });
      expect(res.status, res.text).toBe(200);
      expect(await row(request.id)).toMatchObject({ decisionReason: "1234567890", decisionCategory: "POLICY" });
      expect((await events(request.id))[1]).toMatchObject({ type: "REJECTED", reason: "1234567890", category: "POLICY" });
    }
  });

  it("TEST-F04-26 / AC-F04-26: an approval reason has no minimum", async () => {
    const s = await scenario();
    const cases: Array<[string | undefined, string | null]> = [[undefined, null], ["ok", "ok"], ["123456789", "123456789"]];
    for (const [reason, stored] of cases) {
      const request = await submit(s.requesterAgent, s.reviewer.id);
      const res = await decide(s.reviewerAgent, request.id, { decision: "APPROVE", reason });
      expect(res.status, res.text).toBe(200);
      expect((await row(request.id)).decisionReason).toBe(stored);
    }
  });

  it("TEST-F04-27 / AC-F04-27: who may decide is checked before the reason and the category", async () => {
    const s = await scenario();
    const own = await submit(s.reviewerAgent, s.other.id);
    const body = { decision: "REJECT", reason: "No" };
    const attempts = [
      { agent: s.reviewerAgent, id: own.id, status: 403, code: "SELF_APPROVAL_FORBIDDEN" },
      { agent: s.otherAgent, id: s.request.id, status: 404, code: "NOT_FOUND" },
      { agent: s.requesterAgent, id: s.request.id, status: 403, code: "FORBIDDEN" },
    ];
    for (const attempt of attempts) {
      const res = await decide(attempt.agent, attempt.id, body);
      expect(res.status, attempt.code).toBe(attempt.status);
      expect(res.body.error?.code).toBe(attempt.code);
    }
    await expectUndecided(own.id, "own request");
    await expectUndecided(s.request.id, "assigned to another reviewer");
  });

  it("TEST-F04-30 / AC-F04-30: a missing or unknown category is refused, together with a short reason", async () => {
    const s = await scenario();
    const reason = "Please get a second quotation.";
    const cases: Array<[string, Record<string, unknown>, Record<string, string>]> = [
      ["a missing category", { reason }, { category: CHOOSE_CATEGORY }],
      ["a null category", { reason, category: null }, { category: CHOOSE_CATEGORY }],
      ["an empty category", { reason, category: "" }, { category: CHOOSE_CATEGORY }],
      ["a lower-case category", { reason, category: "budget" }, { category: CHOOSE_CATEGORY }],
      ["an unknown category", { reason, category: "REFUND" }, { category: CHOOSE_CATEGORY }],
      ["a number", { reason, category: 3 }, { category: CHOOSE_CATEGORY }],
      ["a short reason and no category", { reason: "No" }, { category: CHOOSE_CATEGORY, reason: TOO_SHORT }],
    ];
    for (const [label, input, fields] of cases) {
      const request = await submit(s.requesterAgent, s.reviewer.id);
      const res = await decide(s.reviewerAgent, request.id, { decision: "REJECT", ...input });
      expect(res.status, label).toBe(400);
      expect(res.body.error?.fields, label).toEqual(fields);
      await expectUndecided(request.id, label);
    }
  });

  it("TEST-F04-31 / AC-F04-31: an approval takes no category", async () => {
    const s = await scenario();
    const refused = await decide(s.reviewerAgent, s.request.id, { decision: "APPROVE", category: "BUDGET" });
    expect(refused.status, refused.text).toBe(400);
    expect(refused.body.error?.fields).toEqual({ category: "A category applies to a rejection only." });
    await expectUndecided(s.request.id, "approval with a category");

    const ok = await decide(s.reviewerAgent, s.request.id, { decision: "APPROVE", category: null });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.request.decisionCategory).toBeNull();
  });

  it("TEST-F04-32 / AC-F04-32: every category is stored and returned to the requester", async () => {
    const s = await scenario();
    for (const category of CATEGORIES) {
      const request = await submit(s.requesterAgent, s.reviewer.id);
      const reason = `Rejected as ${category}.`;
      const res = await decide(s.reviewerAgent, request.id, { decision: "REJECT", reason, category });
      expect(res.status, res.text).toBe(200);
      expect((await row(request.id)).decisionCategory, category).toBe(category);
      expect((await events(request.id))[1], category).toMatchObject({ type: "REJECTED", category });

      const detail = await s.requesterAgent.get(`/api/requests/${request.id}`);
      expect(detail.status, detail.text).toBe(200);
      expect(detail.body.request.decisionCategory, category).toBe(category);
      expect(detail.body.request.history[1].category, category).toBe(category);
      expect(detail.body.request.history[0].category, category).toBeNull();
    }
  });
});
