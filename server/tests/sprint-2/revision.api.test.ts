import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import {
  COMMENT, STALE_MESSAGE, decide, resubmit, returnedScenario, row, scenario, sendReturn, snapshot,
} from "./helpers.js";

// F-06: a reviewer acts only on the revision they saw (contract §1.4 and §3, AC-F06-14 and 15).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const REJECTION = { decision: "REJECT", reason: "Already ordered last week.", category: "DUPLICATE" };

describe("the revision of a request", () => {
  it("TEST-F06-14 / AC-F06-14: after a resubmission, an action without the current revision is refused", async () => {
    const s = await returnedScenario(t);
    const id = s.request.id;
    expect((await resubmit(s.requesterAgent, id)).status).toBe(200);
    const before = await snapshot(t, id);

    for (const revision of [{}, { revision: 0 }]) {
      const calls = [
        () => decide(s.reviewerAgent, id, { decision: "APPROVE", ...revision }),
        () => decide(s.reviewerAgent, id, { ...REJECTION, ...revision }),
        () => sendReturn(s.reviewerAgent, id, { comment: COMMENT, ...revision }),
      ];
      for (const call of calls) {
        const res = await call();
        expect(res.status, res.text).toBe(409);
        expect(res.body.error).toMatchObject({ code: "STALE_REVISION", message: STALE_MESSAGE });
      }
    }
    expect(await snapshot(t, id)).toEqual(before);

    const ok = await decide(s.reviewerAgent, id, { decision: "APPROVE", revision: 1 });
    expect(ok.status, ok.text).toBe(200);
  });

  it("TEST-F06-15 / AC-F06-15: a revision that is not a whole number is invalid, and a different one is stale", async () => {
    const s = await scenario(t);
    const id = s.request.id;
    const before = await snapshot(t, id);

    for (const revision of ["0", -1, 1.5]) {
      for (const call of [
        () => decide(s.reviewerAgent, id, { decision: "APPROVE", revision }),
        () => sendReturn(s.reviewerAgent, id, { comment: COMMENT, revision }),
      ]) {
        const res = await call();
        expect(res.status, `${JSON.stringify(revision)}: ${res.text}`).toBe(400);
        expect(res.body.error?.fields).toEqual({ revision: "Reload the request and try again." });
      }
    }
    for (const call of [
      () => decide(s.reviewerAgent, id, { decision: "APPROVE", revision: 5 }),
      () => sendReturn(s.reviewerAgent, id, { comment: COMMENT, revision: 5 }),
    ]) {
      const res = await call();
      expect(res.status, res.text).toBe(409);
      expect(res.body.error?.code).toBe("STALE_REVISION");
    }
    expect(await snapshot(t, id)).toEqual(before);

    const ok = await decide(s.reviewerAgent, id, { decision: "APPROVE", revision: 0 });
    expect(ok.status, ok.text).toBe(200);
    expect((await row(t, id)).status).toBe("APPROVED");
  });
});
