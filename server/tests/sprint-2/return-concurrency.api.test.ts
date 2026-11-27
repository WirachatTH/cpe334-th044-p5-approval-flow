import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import {
  DECIDED_MESSAGE, NOT_RETURNED_MESSAGE, RETURNED_MESSAGE, decide, events, resubmit, returnedScenario, row, scenario,
  sendReturn,
} from "./helpers.js";

// TEST-F06-17 / AC-F06-17: two operations on one request at the same moment. The conditional UPDATE lets only one of
// them change the row; the other gets 409 with the message for what the request holds now.

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("competing operations", () => {
  it("TEST-F06-17 / AC-F06-17: a return and an approval sent together give one winner, ten times", async () => {
    for (let round = 1; round <= 10; round += 1) {
      const s = await scenario(t);
      const [returned, approved] = await Promise.all([
        sendReturn(s.reviewerAgent, s.request.id),
        decide(s.reviewerAgent, s.request.id, { decision: "APPROVE" }),
      ]);
      expect([returned.status, approved.status].sort(), `round ${round}`).toEqual([200, 409]);
      const loser = returned.status === 200 ? approved : returned;
      expect(loser.body.error, `round ${round}`).toMatchObject({
        code: "INVALID_TRANSITION",
        message: returned.status === 200 ? RETURNED_MESSAGE : DECIDED_MESSAGE,
      });
      const winner = returned.status === 200 ? "RETURNED" : "APPROVED";
      expect((await row(t, s.request.id)).status, `round ${round}`).toBe(winner);
      expect((await events(t, s.request.id)).map((e) => e.type), `round ${round}`).toEqual(["SUBMITTED", winner]);
    }
  }, 120_000);

  it("TEST-F06-17 / AC-F06-17: two resubmissions sent together give one winner, ten times", async () => {
    for (let round = 1; round <= 10; round += 1) {
      const s = await returnedScenario(t);
      const both = await Promise.all([
        resubmit(s.requesterAgent, s.request.id),
        resubmit(s.requesterAgent, s.request.id),
      ]);
      expect(both.map((r) => r.status).sort(), `round ${round}`).toEqual([200, 409]);
      expect(both.find((r) => r.status === 409)!.body.error, `round ${round}`).toMatchObject({
        code: "INVALID_TRANSITION",
        message: NOT_RETURNED_MESSAGE,
      });
      expect((await row(t, s.request.id)).revision, `round ${round}`).toBe(1);
      expect((await events(t, s.request.id)).map((e) => e.type), `round ${round}`).toEqual(["SUBMITTED", "RETURNED", "RESUBMITTED"]);
    }
  }, 120_000);
});
