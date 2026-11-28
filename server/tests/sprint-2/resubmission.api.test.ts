import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshUser, signedIn, startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import {
  NOT_RETURNED_MESSAGE, VALUES, decide, events, resubmit, returnedScenario, row, scenario, sendReturn, snapshot,
} from "./helpers.js";

// F-06: editing and resubmitting a returned request, against a real database (contract §3, AC-F06-07 to 13 and 16).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const NEW_VALUES = { title: "Oscilloscope, model DS-100", description: "With two probes.", amount: "250.00" };

describe("resubmitting a request", () => {
  it("TEST-F06-07 / AC-F06-07: a returned request leaves the inbox and comes back when it is resubmitted", async () => {
    const s = await returnedScenario(t);
    const ids = async () => {
      const res = await s.reviewerAgent.get("/api/reviews/inbox");
      expect(res.status, res.text).toBe(200);
      return res.body.requests.map((r: { id: number }) => r.id);
    };
    expect(await ids()).not.toContain(s.request.id);
    expect((await resubmit(s.requesterAgent, s.request.id)).status).toBe(200);
    expect(await ids()).toContain(s.request.id);
  });

  it("TEST-F06-08 / AC-F06-08: new values are stored, the number and reviewer stay, and the history gains one entry", async () => {
    const s = await returnedScenario(t);
    const earlier = await events(t, s.request.id);
    const res = await resubmit(s.requesterAgent, s.request.id, NEW_VALUES);

    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({
      ...NEW_VALUES,
      status: "SUBMITTED",
      revision: 1,
      requestNumber: s.request.requestNumber,
      assignedReviewer: { id: s.reviewer.id },
      decidedBy: null,
      decisionReason: null,
      decidedAt: null,
    });
    const stored = await row(t, s.request.id);
    expect(stored).toMatchObject({
      status: "SUBMITTED",
      title: NEW_VALUES.title,
      description: NEW_VALUES.description,
      assignedReviewerId: s.reviewer.id,
      decidedById: null,
      decidedAt: null,
      decisionReason: null,
      decisionCategory: null,
      revision: 1,
    });
    expect(stored.amount.toFixed(2)).toBe("250.00");
    const history = await events(t, s.request.id);
    expect(history.slice(0, 2)).toEqual(earlier);
    expect(history).toHaveLength(3);
    expect(history[2]).toMatchObject({
      type: "RESUBMITTED",
      fromStatus: "RETURNED",
      toStatus: "SUBMITTED",
      actorId: s.requester.id,
      reason: null,
    });
  });

  it("TEST-F06-09 / AC-F06-09: unchanged values are accepted, and other fields in the body change nothing", async () => {
    const s = await returnedScenario(t);
    const res = await resubmit(s.requesterAgent, s.request.id, {
      ...VALUES,
      assignedReviewerId: s.other.id,
      requesterId: s.other.id,
      status: "APPROVED",
      requestNumber: "REQ-999999",
      revision: 99,
    });
    expect(res.status, res.text).toBe(200);
    expect(await row(t, s.request.id)).toMatchObject({
      assignedReviewerId: s.reviewer.id,
      requesterId: s.requester.id,
      requestNumber: s.request.requestNumber,
      status: "SUBMITTED",
      revision: 1,
    });
  });

  it("TEST-F06-10 / AC-F06-10: invalid values are refused and the request stays returned", async () => {
    const s = await returnedScenario(t);
    const before = await snapshot(t, s.request.id);
    const cases: Array<[object, Record<string, string>]> = [
      [{ ...VALUES, title: "  " }, { title: "Enter a title." }],
      [{ ...VALUES, title: "x".repeat(121) }, { title: "Title must be 120 characters or fewer." }],
      [{ ...VALUES, description: "" }, { description: "Enter a description." }],
      [{ ...VALUES, description: "x".repeat(2001) }, { description: "Description must be 2,000 characters or fewer." }],
      [{ ...VALUES, amount: "" }, { amount: "Enter an amount." }],
      [{ ...VALUES, amount: "abc" }, { amount: "Enter the amount as a number, for example 1250.50." }],
      [{ ...VALUES, amount: "0" }, { amount: "Enter an amount greater than 0." }],
      [{ ...VALUES, amount: "1000000.01" }, { amount: "Enter an amount of at most 1,000,000.00 THB." }],
      [{}, { title: "Enter a title.", description: "Enter a description.", amount: "Enter an amount." }],
    ];
    for (const [body, fields] of cases) {
      const res = await resubmit(s.requesterAgent, s.request.id, body);
      expect(res.status, res.text).toBe(400);
      expect(res.body.error?.fields).toEqual(fields);
    }
    expect(await snapshot(t, s.request.id)).toEqual(before);
  });

  it("TEST-F06-11 / AC-F06-11: the boundary amounts and lengths are accepted", async () => {
    for (const change of [{ amount: "0.01" }, { amount: "1000000.00" }, { title: "x".repeat(120) }, { description: "x".repeat(2000) }]) {
      const s = await returnedScenario(t);
      const res = await resubmit(s.requesterAgent, s.request.id, { ...VALUES, ...change });
      expect(res.status, res.text).toBe(200);
      expect(res.body.request).toMatchObject(change);
    }
  });

  it("TEST-F06-12 / AC-F06-12: only the requester may resubmit", async () => {
    const s = await returnedScenario(t);
    const stranger = await signedIn(t, (await freshUser(t, "REQUESTER", "nat")).email);
    const before = await snapshot(t, s.request.id);

    const reviewer = await resubmit(s.reviewerAgent, s.request.id);
    expect(reviewer.status, reviewer.text).toBe(403);
    expect(reviewer.body.error).toMatchObject({ code: "NOT_REQUESTER", message: "Only the requester can resubmit this request." });
    for (const agent of [stranger, s.otherAgent]) {
      const res = await resubmit(agent, s.request.id);
      expect(res.status, res.text).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
    }
    const anonymous = await request(t.app).post(`/api/requests/${s.request.id}/resubmission`).send(VALUES);
    expect(anonymous.status).toBe(401);
    expect(await snapshot(t, s.request.id)).toEqual(before);
  });

  it("TEST-F06-13 / AC-F06-13: a submitted, approved, or rejected request cannot be resubmitted", async () => {
    const submitted = await scenario(t);
    const approved = await scenario(t);
    expect((await decide(approved.reviewerAgent, approved.request.id, { decision: "APPROVE" })).status).toBe(200);
    const rejected = await scenario(t);
    const rejection = { decision: "REJECT", reason: "Already ordered last week.", category: "DUPLICATE" };
    expect((await decide(rejected.reviewerAgent, rejected.request.id, rejection)).status).toBe(200);

    for (const s of [submitted, approved, rejected]) {
      const before = await snapshot(t, s.request.id);
      const res = await resubmit(s.requesterAgent, s.request.id);
      expect(res.status, res.text).toBe(409);
      expect(res.body.error).toMatchObject({ code: "INVALID_TRANSITION", message: NOT_RETURNED_MESSAGE });
      expect(await snapshot(t, s.request.id)).toEqual(before);
    }
  });

  it("TEST-F06-16 / AC-F06-16: two rounds of return and resubmission, then approval, are all in the history", async () => {
    const s = await scenario(t);
    const id = s.request.id;
    expect((await sendReturn(s.reviewerAgent, id, { comment: "First comment" })).status).toBe(200);
    expect((await resubmit(s.requesterAgent, id)).status).toBe(200);
    expect((await sendReturn(s.reviewerAgent, id, { comment: "Second comment", revision: 1 })).status).toBe(200);
    expect((await resubmit(s.requesterAgent, id)).status).toBe(200);
    expect((await decide(s.reviewerAgent, id, { decision: "APPROVE", revision: 2 })).status).toBe(200);

    const history = await events(t, id);
    expect(history.map((e) => e.type)).toEqual(["SUBMITTED", "RETURNED", "RESUBMITTED", "RETURNED", "RESUBMITTED", "APPROVED"]);
    expect(history.map((e) => e.actorId)).toEqual([
      s.requester.id, s.reviewer.id, s.requester.id, s.reviewer.id, s.requester.id, s.reviewer.id,
    ]);
    expect(history.map((e) => e.reason)).toEqual([null, "First comment", null, "Second comment", null, null]);
    expect((await row(t, id)).revision).toBe(2);
  });
});
