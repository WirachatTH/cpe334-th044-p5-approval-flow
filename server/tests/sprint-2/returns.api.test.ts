import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshUser, signedIn, startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import {
  COMMENT, DECIDED_MESSAGE, RETURNED_MESSAGE, decide, events, returnedScenario, row, scenario, sendReturn, snapshot,
  submit,
} from "./helpers.js";

// F-06: returning a request, against a real database (contract §3, AC-F06-01 to 06).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("returning a request", () => {
  it("TEST-F06-01 / AC-F06-01: a return stores the reviewer, the time, and the trimmed comment, with one history entry", async () => {
    const s = await scenario(t);
    const res = await sendReturn(s.reviewerAgent, s.request.id, { comment: "  Add the total.  " });

    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({
      status: "RETURNED",
      revision: 0,
      decidedBy: { id: s.reviewer.id },
      decisionReason: "Add the total.",
      decisionCategory: null,
    });
    const stored = await row(t, s.request.id);
    expect(stored).toMatchObject({ status: "RETURNED", decidedById: s.reviewer.id, decisionReason: "Add the total." });
    expect(stored.decidedAt).not.toBeNull();
    const history = await events(t, s.request.id);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      type: "RETURNED",
      fromStatus: "SUBMITTED",
      toStatus: "RETURNED",
      actorId: s.reviewer.id,
      reason: "Add the total.",
      category: null,
    });
    expect(history[1].createdAt.getTime()).toBe(stored.decidedAt!.getTime());
  });

  it("TEST-F06-02 / AC-F06-02: a missing, blank, non-text, or too long comment is refused", async () => {
    const required = "Enter a comment to return this request.";
    const cases: Array<[string, object, string]> = [
      ["missing", {}, required],
      ["null", { comment: null }, required],
      ["empty", { comment: "" }, required],
      ["spaces", { comment: "   " }, required],
      ["a number", { comment: 5 }, "Enter the comment as text."],
      ["1001 characters", { comment: "x".repeat(1001) }, "Comment must be 1,000 characters or fewer."],
    ];
    for (const [label, body, message] of cases) {
      const s = await scenario(t);
      const before = await snapshot(t, s.request.id);
      const res = await sendReturn(s.reviewerAgent, s.request.id, body);
      expect(res.status, `${label}: ${res.text}`).toBe(400);
      expect(res.body.error?.fields, label).toEqual({ comment: message });
      expect(await snapshot(t, s.request.id), label).toEqual(before);
    }
  });

  it("TEST-F06-03 / AC-F06-03: 1 character, 1000 inside spaces, and 1000 emoji are accepted and stored trimmed", async () => {
    for (const comment of ["a", `  ${"x".repeat(1000)}  `, "\u{1F600}".repeat(1000)]) {
      const s = await scenario(t);
      const res = await sendReturn(s.reviewerAgent, s.request.id, { comment });
      expect(res.status, res.text).toBe(200);
      expect((await row(t, s.request.id)).decisionReason).toBe(comment.trim());
    }
  });

  it("TEST-F06-04 / AC-F06-04: only the assigned reviewer may return, and nobody their own request", async () => {
    const s = await scenario(t);
    const before = await snapshot(t, s.request.id);

    const requester = await sendReturn(s.requesterAgent, s.request.id);
    expect(requester.status).toBe(403);
    expect(requester.body.error?.code).toBe("FORBIDDEN");
    const anonymous = await request(t.app).post(`/api/requests/${s.request.id}/return`).send({ comment: COMMENT });
    expect(anonymous.status).toBe(401);
    const unrelated = await sendReturn(s.otherAgent, s.request.id);
    const missing = await sendReturn(s.otherAgent, 999999);
    expect(unrelated.status, unrelated.text).toBe(404);
    expect(unrelated.body.error?.code).toBe("NOT_FOUND");
    expect(unrelated.body).toEqual(missing.body);
    expect(await snapshot(t, s.request.id)).toEqual(before);

    const submitter = await freshUser(t, "REVIEWER", "own");
    const submitterAgent = await signedIn(t, submitter.email);
    const own = await submit(submitterAgent, s.reviewer.id);
    const ownBefore = await snapshot(t, own.id);
    for (const body of [{ comment: COMMENT }, {}]) {
      const res = await sendReturn(submitterAgent, own.id, body);
      expect(res.status, res.text).toBe(403);
      expect(res.body.error).toMatchObject({
        code: "SELF_REVIEW_FORBIDDEN",
        message: "You cannot return a request you submitted.",
      });
    }
    expect(await snapshot(t, own.id)).toEqual(ownBefore);
  });

  it("TEST-F06-05 / AC-F06-05: an approved, rejected, or returned request cannot be returned", async () => {
    const approved = await scenario(t);
    expect((await decide(approved.reviewerAgent, approved.request.id, { decision: "APPROVE" })).status).toBe(200);
    const rejected = await scenario(t);
    const rejection = { decision: "REJECT", reason: "Already ordered last week.", category: "DUPLICATE" };
    expect((await decide(rejected.reviewerAgent, rejected.request.id, rejection)).status).toBe(200);
    const returned = await returnedScenario(t);

    for (const [s, message] of [[approved, DECIDED_MESSAGE], [rejected, DECIDED_MESSAGE], [returned, RETURNED_MESSAGE]] as const) {
      const before = await snapshot(t, s.request.id);
      const res = await sendReturn(s.reviewerAgent, s.request.id);
      expect(res.status, res.text).toBe(409);
      expect(res.body.error).toMatchObject({ code: "INVALID_TRANSITION", message });
      expect(await snapshot(t, s.request.id)).toEqual(before);
    }
  });

  it("TEST-F06-06 / AC-F06-06: a returned request cannot be approved or rejected", async () => {
    const s = await returnedScenario(t);
    const before = await snapshot(t, s.request.id);
    for (const body of [{ decision: "APPROVE" }, { decision: "REJECT", reason: "Already ordered.", category: "DUPLICATE" }]) {
      const res = await decide(s.reviewerAgent, s.request.id, body);
      expect(res.status, res.text).toBe(409);
      expect(res.body.error).toMatchObject({ code: "INVALID_TRANSITION", message: RETURNED_MESSAGE });
    }
    expect(await snapshot(t, s.request.id)).toEqual(before);
  });
});
