import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import {
  DECIDED_MESSAGE, NOT_RETURNED_MESSAGE, STALE_MESSAGE, decide, events, resubmit, row, sendReturn, snapshot,
} from "./helpers.js";
import { REJECTION, WAITING_MESSAGE, highScenario, waitingScenario } from "./second-approval-helpers.js";

// F-07: two approvals above 100,000.00 THB, against a real database (contract §3, AC-F07-01 to 05, 12, and 14).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("the second approval", () => {
  it("TEST-F07-01 / AC-F07-01: above the threshold the first approval leaves the request waiting", async () => {
    const s = await highScenario(t, "100000.01");
    const res = await decide(s.firstAgent, s.request.id, { decision: "APPROVE", reason: "  Within budget  " });

    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({
      status: "AWAITING_SECOND_APPROVAL",
      firstApproval: { by: { id: s.first.id } },
      decidedBy: { id: s.first.id },
    });
    const stored = await row(t, s.request.id);
    expect(stored).toMatchObject({ status: "AWAITING_SECOND_APPROVAL", firstApprovedById: s.first.id });
    const history = await events(t, s.request.id);
    expect(history.map((e) => e.type)).toEqual(["SUBMITTED", "FIRST_APPROVED"]);
    expect(history[1]).toMatchObject({
      fromStatus: "SUBMITTED",
      toStatus: "AWAITING_SECOND_APPROVAL",
      actorId: s.first.id,
      reason: "Within budget",
      category: null,
    });
    expect(stored.firstApprovedAt!.getTime()).toBe(history[1].createdAt.getTime());
    expect(res.body.request.firstApproval.at).toBe(history[1].createdAt.toISOString());
  });

  it("TEST-F07-02 / AC-F07-02: 100,000.00 and 0.01 need one approval", async () => {
    for (const amount of ["100000.00", "0.01"]) {
      const s = await highScenario(t, amount);
      const res = await decide(s.firstAgent, s.request.id, { decision: "APPROVE" });
      expect(res.status, res.text).toBe(200);
      expect(res.body.request, amount).toMatchObject({ status: "APPROVED", firstApproval: null });
      expect((await events(t, s.request.id)).map((e) => e.type), amount).toEqual(["SUBMITTED", "APPROVED"]);
    }
  });

  it("TEST-F07-03 / AC-F07-03: a second reviewer's approval approves the request and keeps the first approval", async () => {
    const s = await waitingScenario(t);
    const res = await decide(s.secondAgent, s.request.id, { decision: "APPROVE" });

    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({
      status: "APPROVED",
      decidedBy: { id: s.second.id },
      firstApproval: { by: { id: s.first.id } },
    });
    const history = await events(t, s.request.id);
    expect(history.map((e) => e.type)).toEqual(["SUBMITTED", "FIRST_APPROVED", "APPROVED"]);
    expect(history[2]).toMatchObject({ fromStatus: "AWAITING_SECOND_APPROVAL", toStatus: "APPROVED", actorId: s.second.id });
  });

  it("TEST-F07-04 / AC-F07-04: a second reviewer rejects with a category and a reason", async () => {
    const s = await waitingScenario(t);
    const before = await snapshot(t, s.request.id);
    const invalid = await decide(s.secondAgent, s.request.id, { decision: "REJECT", reason: "No" });
    expect(invalid.status, invalid.text).toBe(400);
    expect(Object.keys(invalid.body.error.fields).sort()).toEqual(["category", "reason"]);
    expect(await snapshot(t, s.request.id)).toEqual(before);

    const res = await decide(s.secondAgent, s.request.id, REJECTION);
    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({
      status: "REJECTED",
      decisionCategory: "DUPLICATE",
      decisionReason: REJECTION.reason,
      firstApproval: { by: { id: s.first.id } },
    });
    expect((await events(t, s.request.id)).map((e) => e.type)).toEqual(["SUBMITTED", "FIRST_APPROVED", "REJECTED"]);
  });

  it("TEST-F07-05 / AC-F07-05: the assigned reviewer can reject a high request at once", async () => {
    const s = await highScenario(t);
    const res = await decide(s.firstAgent, s.request.id, REJECTION);
    expect(res.status, res.text).toBe(200);
    expect(res.body.request).toMatchObject({ status: "REJECTED", firstApproval: null });
  });

  it("TEST-F07-12 / AC-F07-12: no return or resubmission of a waiting request, and no decision after two approvals", async () => {
    const waiting = await waitingScenario(t);
    const waitingBefore = await snapshot(t, waiting.request.id);
    const returned = await sendReturn(waiting.firstAgent, waiting.request.id);
    expect(returned.status, returned.text).toBe(409);
    expect(returned.body.error).toMatchObject({ code: "INVALID_TRANSITION", message: WAITING_MESSAGE });
    const resubmitted = await resubmit(waiting.requesterAgent, waiting.request.id);
    expect(resubmitted.status, resubmitted.text).toBe(409);
    expect(resubmitted.body.error?.message).toBe(NOT_RETURNED_MESSAGE);
    expect(await snapshot(t, waiting.request.id)).toEqual(waitingBefore);

    const approved = await waitingScenario(t);
    expect((await decide(approved.secondAgent, approved.request.id, { decision: "APPROVE" })).status).toBe(200);
    const approvedBefore = await snapshot(t, approved.request.id);
    for (const agent of [approved.firstAgent, approved.secondAgent]) {
      const res = await decide(agent, approved.request.id, { decision: "APPROVE" });
      expect(res.status, res.text).toBe(409);
      expect(res.body.error).toMatchObject({ code: "INVALID_TRANSITION", message: DECIDED_MESSAGE });
    }
    expect(await snapshot(t, approved.request.id)).toEqual(approvedBefore);
  });

  it("TEST-F07-14 / AC-F07-14: both approvals of a resubmitted request name its revision", async () => {
    const s = await highScenario(t);
    const id = s.request.id;
    expect((await sendReturn(s.firstAgent, id)).status).toBe(200);
    expect((await resubmit(s.requesterAgent, id, { title: "Server", description: "Rack server.", amount: "250000.00" })).status).toBe(200);

    for (const [agent, status] of [[s.firstAgent, "AWAITING_SECOND_APPROVAL"], [s.secondAgent, "APPROVED"]] as const) {
      const stale = await decide(agent, id, { decision: "APPROVE" });
      expect(stale.status, stale.text).toBe(409);
      expect(stale.body.error).toMatchObject({ code: "STALE_REVISION", message: STALE_MESSAGE });
      const ok = await decide(agent, id, { decision: "APPROVE", revision: 1 });
      expect(ok.status, ok.text).toBe(200);
      expect(ok.body.request.status).toBe(status);
    }
  });
});
