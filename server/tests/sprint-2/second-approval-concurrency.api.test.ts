import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import { decide, events, row } from "./helpers.js";
import { REJECTION, anotherReviewer, highScenario, waitingScenario } from "./second-approval-helpers.js";

// TEST-F07-13 / AC-F07-13: competing approvals. One call wins; the other is refused at the write (409), or, when it
// arrives after the winner is stored, by the access rules (404 for a second reviewer, 403 for the first approver).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("competing approvals", () => {
  it("TEST-F07-13 / AC-F07-13: two second reviewers at once give one decision, ten times", async () => {
    for (let round = 1; round <= 10; round += 1) {
      const s = await waitingScenario(t);
      const third = await anotherReviewer(t);
      const both = await Promise.all([
        decide(s.secondAgent, s.request.id, { decision: "APPROVE" }),
        decide(third.agent, s.request.id, REJECTION),
      ]);
      const winners = both.filter((r) => r.status === 200);
      expect(winners, `round ${round}`).toHaveLength(1);
      expect([404, 409], `round ${round}`).toContain(both.find((r) => r.status !== 200)!.status);
      expect((await row(t, s.request.id)).status, `round ${round}`).toBe(winners[0].body.request.status);
      expect(await events(t, s.request.id), `round ${round}`).toHaveLength(3);
    }
  }, 120_000);

  it("TEST-F07-13 / AC-F07-13: two first approvals at once give one, ten times", async () => {
    for (let round = 1; round <= 10; round += 1) {
      const s = await highScenario(t);
      const both = await Promise.all([
        decide(s.firstAgent, s.request.id, { decision: "APPROVE" }),
        decide(s.firstAgent, s.request.id, { decision: "APPROVE" }),
      ]);
      expect(both.filter((r) => r.status === 200), `round ${round}`).toHaveLength(1);
      expect([403, 409], `round ${round}`).toContain(both.find((r) => r.status !== 200)!.status);
      expect((await row(t, s.request.id)).status, `round ${round}`).toBe("AWAITING_SECOND_APPROVAL");
      expect((await events(t, s.request.id)).map((e) => e.type), `round ${round}`).toEqual(["SUBMITTED", "FIRST_APPROVED"]);
    }
  }, 120_000);
});
