import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { PASSWORD, startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import {
  COMMENT, DECIDED_MESSAGE, NOT_RETURNED_MESSAGE, RETURNED_MESSAGE, STALE_MESSAGE, decide, events, resubmit,
  returnedScenario, row, scenario, sendReturn, snapshot,
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

// The same app, except that the revision of the request changes right after a handler has read it, as when its
// requester resubmits between the read and the write.
function appWithResubmissionAfterTheRead() {
  const prisma = t.prisma.$extends({
    query: {
      approvalRequest: {
        async findUnique({ args, query }) {
          const found = await query(args);
          await t.prisma.approvalRequest.update({ where: { id: args.where.id }, data: { revision: { increment: 1 } } });
          return found;
        },
      },
    },
  });
  return createApp({ prisma: prisma as unknown as PrismaClient, config: t.config, throttle: t.throttle });
}

describe("a resubmission between the read and the write", () => {
  it("TEST-F06-17 / AC-F06-17: a decision and a return then change nothing and say the request changed", async () => {
    for (const action of [
      { path: "decision", body: { decision: "APPROVE" } },
      { path: "return", body: { comment: COMMENT } },
    ]) {
      const s = await scenario(t);
      const agent = request.agent(appWithResubmissionAfterTheRead());
      const login = await agent.post("/api/auth/login").send({ email: s.reviewer.email, password: PASSWORD });
      expect(login.status, login.text).toBe(200);
      const before = await snapshot(t, s.request.id);

      const res = await agent.post(`/api/requests/${s.request.id}/${action.path}`).send(action.body);

      expect(res.status, `${action.path}: ${res.text}`).toBe(409);
      expect(res.body.error, action.path).toMatchObject({ code: "STALE_REVISION", message: STALE_MESSAGE });
      const after = await snapshot(t, s.request.id);
      expect(after.history, action.path).toEqual(before.history);
      expect(after.request.status, action.path).toBe("SUBMITTED");
    }
  });
});
