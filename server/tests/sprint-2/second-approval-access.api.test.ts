import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshUser, signedIn, startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import { decide, snapshot, type Agent } from "./helpers.js";
import {
  HIGH, REJECTION, SAME_APPROVER_MESSAGE, anotherReviewer, highScenario, submitAmount, waitingScenario,
} from "./second-approval-helpers.js";

// F-07: who may decide and who may see a request above the threshold (contract §3, AC-F07-06 to 11).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const detail = (agent: Agent, id: number) => agent.get(`/api/requests/${id}`);

describe("access to the second approval", () => {
  it("TEST-F07-06 / AC-F07-06: the first approver cannot give the second decision", async () => {
    const s = await waitingScenario(t);
    const before = await snapshot(t, s.request.id);
    for (const body of [{ decision: "APPROVE" }, REJECTION]) {
      const res = await decide(s.firstAgent, s.request.id, body);
      expect(res.status, res.text).toBe(403);
      expect(res.body.error).toMatchObject({ code: "SAME_APPROVER_FORBIDDEN", message: SAME_APPROVER_MESSAGE });
    }
    expect(await snapshot(t, s.request.id)).toEqual(before);
  });

  it("TEST-F07-07 / AC-F07-07: a reviewer's own high request is approved by two others", async () => {
    const submitter = await anotherReviewer(t, "own");
    const first = await anotherReviewer(t, "mint");
    const second = await anotherReviewer(t, "anan");
    const own = await submitAmount(submitter.agent, first.user.id, HIGH);
    expect((await decide(first.agent, own.id, { decision: "APPROVE" })).status).toBe(200);

    const self = await decide(submitter.agent, own.id, { decision: "APPROVE" });
    expect(self.status, self.text).toBe(403);
    expect(self.body.error?.code).toBe("SELF_APPROVAL_FORBIDDEN");

    const res = await decide(second.agent, own.id, { decision: "APPROVE" });
    expect(res.status, res.text).toBe(200);
    expect(res.body.request.status).toBe("APPROVED");
  });

  it("TEST-F07-08 / AC-F07-08: a requester and no session cannot decide a waiting request", async () => {
    const s = await waitingScenario(t);
    const before = await snapshot(t, s.request.id);
    const requester = await decide(s.requesterAgent, s.request.id, { decision: "APPROVE" });
    expect(requester.status).toBe(403);
    expect(requester.body.error?.code).toBe("FORBIDDEN");
    const anonymous = await request(t.app).post(`/api/requests/${s.request.id}/decision`).send({ decision: "APPROVE" });
    expect(anonymous.status).toBe(401);
    expect(await snapshot(t, s.request.id)).toEqual(before);
  });

  it("TEST-F07-09 / AC-F07-09: before the first approval another reviewer sees nothing", async () => {
    const s = await highScenario(t);
    const read = await detail(s.secondAgent, s.request.id);
    const missing = await detail(s.secondAgent, 999999);
    expect(read.status).toBe(404);
    expect(read.body).toEqual(missing.body);
    const res = await decide(s.secondAgent, s.request.id, { decision: "APPROVE" });
    expect(res.status, res.text).toBe(404);
    expect(res.body).toEqual(missing.body);
  });

  it("TEST-F07-10 / AC-F07-10: eligible reviewers see a waiting request, and afterwards only those involved", async () => {
    const s = await waitingScenario(t);
    const third = await anotherReviewer(t);
    const stranger = await signedIn(t, (await freshUser(t, "REQUESTER", "nat")).email);
    const statuses = async () =>
      Promise.all(
        [s.secondAgent, third.agent, stranger, s.requesterAgent, s.firstAgent].map(
          async (agent) => (await detail(agent, s.request.id)).status,
        ),
      );

    expect(await statuses()).toEqual([200, 200, 404, 200, 200]);
    expect((await decide(s.secondAgent, s.request.id, { decision: "APPROVE" })).status).toBe(200);
    expect(await statuses()).toEqual([200, 404, 404, 200, 200]);
  });

  it("TEST-F07-11 / AC-F07-11: the inbox lists a high request for whoever may decide it next", async () => {
    const submitter = await anotherReviewer(t, "own");
    const first = await anotherReviewer(t, "mint");
    const second = await anotherReviewer(t, "anan");
    const own = await submitAmount(submitter.agent, first.user.id, HIGH);
    const mine = async (agent: Agent) => {
      const res = await agent.get("/api/reviews/inbox");
      expect(res.status, res.text).toBe(200);
      return res.body.requests.filter((r: { id: number }) => r.id === own.id).map((r: { status: string }) => r.status);
    };
    const inboxes = async () => [await mine(first.agent), await mine(submitter.agent), await mine(second.agent)];

    expect(await inboxes()).toEqual([["SUBMITTED"], [], []]);
    expect((await decide(first.agent, own.id, { decision: "APPROVE" })).status).toBe(200);
    expect(await inboxes()).toEqual([[], [], ["AWAITING_SECOND_APPROVAL"]]);
    expect((await decide(second.agent, own.id, { decision: "APPROVE" })).status).toBe(200);
    expect(await inboxes()).toEqual([[], [], []]);
  });
});
