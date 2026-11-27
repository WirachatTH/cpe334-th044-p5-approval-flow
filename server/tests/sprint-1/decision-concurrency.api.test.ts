import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshUser, signedIn, startTestApp, type TestApp } from "./helpers/app.js";

// TEST-F04-12 / AC-F04-12: two decisions on the same request at the same moment. The conditional UPDATE lets only
// one of them match status = 'SUBMITTED', so exactly one wins; the other gets 409 and adds no history entry.

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("competing decisions", () => {
  it("TEST-F04-12 / AC-F04-12: an approve and a reject sent together give exactly one 200 and one 409, twenty times", async () => {
    const [requester, reviewer] = await Promise.all([freshUser(t, "REQUESTER", "ploy"), freshUser(t, "REVIEWER", "mint")]);
    const requesterAgent = await signedIn(t, requester.email);
    const reviewerAgent = await signedIn(t, reviewer.email);

    for (let round = 1; round <= 20; round += 1) {
      const created = await requesterAgent.post("/api/requests").send({
        title: `Race ${round}`,
        description: "Two decisions at the same moment.",
        amount: "100.00",
        assignedReviewerId: reviewer.id,
      });
      expect(created.status, created.text).toBe(201);
      const id = created.body.request.id as number;

      const [approve, reject] = await Promise.all([
        reviewerAgent.post(`/api/requests/${id}/decision`).send({ decision: "APPROVE" }),
        reviewerAgent.post(`/api/requests/${id}/decision`).send({ decision: "REJECT", reason: "Over budget.", category: "BUDGET" }),
      ]);

      const statuses = [approve.status, reject.status].sort();
      expect(statuses, `round ${round}`).toEqual([200, 409]);
      const winner = approve.status === 200 ? approve : reject;
      const expected = approve.status === 200 ? "APPROVED" : "REJECTED";
      expect(winner.body.request.status, `round ${round}`).toBe(expected);

      const row = await t.prisma.approvalRequest.findUniqueOrThrow({ where: { id } });
      expect(row.status, `round ${round}: the final status is the winner's`).toBe(expected);
      const decisions = await t.prisma.requestEvent.findMany({ where: { requestId: id, type: { in: ["APPROVED", "REJECTED"] } } });
      expect(decisions, `round ${round}: exactly one decision event`).toHaveLength(1);
      expect(decisions[0].type).toBe(expected);
    }
  }, 120_000);
});
