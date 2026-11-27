import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ACCOUNTS, freshUser, signedIn, startTestApp, userIds, type TestApp } from "./helpers/app.js";

// F-03: submitting a request, and viewing your own requests, against a real database (contract §3,
// AC-F03-01 to 08, 10 to 14, and the API part of 21).

let t: TestApp;
let ids: Awaited<ReturnType<typeof userIds>>;
beforeAll(async () => {
  t = await startTestApp();
  ids = await userIds(t);
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const DETAIL_KEYS = [
  "id", "requestNumber", "title", "description", "amount", "status", "requester", "assignedReviewer",
  "decidedBy", "decisionCategory", "decisionReason", "decidedAt", "firstApproval", "revision", "createdAt", "updatedAt", "history",
].sort();

const body = (overrides: Record<string, unknown> = {}) => ({
  title: "Oscilloscope for the electronics lab",
  description: "Replace the broken unit in room 401.",
  amount: "18500.00",
  assignedReviewerId: ids.mint,
  ...overrides,
});
const countRequests = () => t.prisma.approvalRequest.count();

// Submits a request and returns it, failing with the response text unless the answer is 201.
async function create(agent: Awaited<ReturnType<typeof signedIn>>, overrides: Record<string, unknown> = {}) {
  const res = await agent.post("/api/requests").send(body(overrides));
  expect(res.status, `submitting a request: ${res.text}`).toBe(201);
  return res.body.request as { id: number; requestNumber: string };
}
const numberOf = (requestNumber: string) => Number(requestNumber.slice("REQ-".length));
const setActive = (id: number, isActive: boolean) => t.prisma.user.update({ where: { id }, data: { isActive } });

describe("submitting a request", () => {
  it("TEST-F03-01 / AC-F03-01: a valid request is stored as SUBMITTED with one history entry", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const before = await countRequests();

    const res = await agent.post("/api/requests").send(body());

    expect(res.status, res.text).toBe(201);
    const created = res.body.request;
    expect(Object.keys(created).sort()).toEqual(DETAIL_KEYS);
    expect(created).toMatchObject({
      status: "SUBMITTED",
      amount: "18500.00",
      requester: { id: ids.ploy, name: "Ploy Srisawat" },
      assignedReviewer: { id: ids.mint, name: "Mint Chaiyaporn" },
      decidedBy: null,
      decisionReason: null,
      decidedAt: null,
    });
    expect(created.requestNumber).toMatch(/^REQ-\d{6}$/);
    expect(created.history).toHaveLength(1);

    expect(await countRequests()).toBe(before + 1);
    const events = await t.prisma.requestEvent.findMany({ where: { requestId: created.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "SUBMITTED", fromStatus: null, toStatus: "SUBMITTED", actorId: ids.ploy });
  });

  it("TEST-F03-02 / AC-F03-02: a reviewer can submit a request to another reviewer", async () => {
    const agent = await signedIn(t, ACCOUNTS.mint);
    const res = await agent.post("/api/requests").send(body({ assignedReviewerId: ids.korn }));
    expect(res.status, res.text).toBe(201);
    expect(res.body.request.requester.id).toBe(ids.mint);
    expect(res.body.request.assignedReviewer.id).toBe(ids.korn);
  });

  it("TEST-F03-03 / AC-F03-03: identity and status fields sent by the client are ignored", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const res = await agent.post("/api/requests").send({
      ...body(),
      requesterId: ids.nattapong,
      status: "APPROVED",
      requestNumber: "REQ-999999",
      decidedById: ids.mint,
    });
    expect(res.status, res.text).toBe(201);

    const row = await t.prisma.approvalRequest.findUniqueOrThrow({ where: { id: res.body.request.id } });
    expect(row.requesterId).toBe(ids.ploy);
    expect(row.status).toBe("SUBMITTED");
    expect(row.requestNumber).not.toBe("REQ-999999");
    expect(row.decidedById).toBeNull();
  });

  it("TEST-F03-04 / AC-F03-04: request numbers are unique and increasing", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const first = await agent.post("/api/requests").send(body());
    const second = await agent.post("/api/requests").send(body());
    expect(first.status, first.text).toBe(201);
    expect(second.status, second.text).toBe(201);
    expect(second.body.request.requestNumber).not.toBe(first.body.request.requestNumber);
    expect(numberOf(second.body.request.requestNumber)).toBeGreaterThan(numberOf(first.body.request.requestNumber));
  });

  it("TEST-F03-05 / AC-F03-05: the amount is a string from 0.01 to 1,000,000.00 with at most two decimals", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    for (const amount of ["0.01", "1000000.00"]) {
      const ok = await agent.post("/api/requests").send(body({ amount }));
      expect(ok.status, `${amount}: ${ok.text}`).toBe(201);
      expect(ok.body.request.amount).toBe(amount);
    }

    const FORMAT = "Enter the amount as a number, for example 1250.50.";
    const invalid: Array<[string, unknown, string]> = [
      ["0", "0", "Enter an amount greater than 0."],
      ["1000000.01", "1000000.01", "Enter an amount of at most 1,000,000.00 THB."],
      ["-5", "-5", FORMAT],
      ["12.345", "12.345", FORMAT],
      ["abc", "abc", FORMAT],
      ["1,000", "1,000", FORMAT],
      ["the number 100", 100, FORMAT],
      ["an empty string", "", "Enter an amount."],
      ["a missing amount", undefined, "Enter an amount."],
    ];
    const before = await countRequests();
    for (const [label, amount, message] of invalid) {
      const res = await agent.post("/api/requests").send(body({ amount }));
      expect(res.status, label).toBe(400);
      expect(res.body.error?.code, label).toBe("VALIDATION_ERROR");
      expect(res.body.error?.fields, label).toEqual({ amount: message });
    }
    expect(await countRequests()).toBe(before);
  });

  // Regression for #64, reported by the UAT team: the maximum itself was refused.
  it("TEST-F03-05 / AC-F03-05: exactly 1,000,000.00 THB is accepted and stored, 0.01 more is not (#64)", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const before = await countRequests();

    for (const typed of ["1000000.00", "1000000.0", "1000000"]) {
      const res = await agent.post("/api/requests").send(body({ amount: typed }));
      expect(res.status, `${typed}: ${res.text}`).toBe(201);
      expect(res.body.request).toMatchObject({ amount: "1000000.00", status: "SUBMITTED" });
      const stored = await t.prisma.approvalRequest.findUniqueOrThrow({ where: { id: res.body.request.id } });
      expect(stored.amount.toFixed(2), typed).toBe("1000000.00");
    }

    const above = await agent.post("/api/requests").send(body({ amount: "1000000.01" }));
    expect(above.status, above.text).toBe(400);
    expect(above.body.error?.fields).toEqual({ amount: "Enter an amount of at most 1,000,000.00 THB." });
    expect(await countRequests()).toBe(before + 3);
  });

  it("TEST-F03-06 / AC-F03-06: title and description lengths are checked after trimming", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const ok = await agent.post("/api/requests").send(body({ title: "t".repeat(120), description: "d".repeat(2000) }));
    expect(ok.status, ok.text).toBe(201);

    const before = await countRequests();
    const invalid: Array<[string, Record<string, unknown>, Record<string, string>]> = [
      ["a 121-character title", { title: "t".repeat(121) }, { title: "Title must be 120 characters or fewer." }],
      ["a 2001-character description", { description: "d".repeat(2001) }, { description: "Description must be 2,000 characters or fewer." }],
      ["a title of spaces", { title: "     " }, { title: "Enter a title." }],
      ["a missing description", { description: undefined }, { description: "Enter a description." }],
    ];
    for (const [label, overrides, fields] of invalid) {
      const res = await agent.post("/api/requests").send(body(overrides));
      expect(res.status, label).toBe(400);
      expect(res.body.error?.fields, label).toEqual(fields);
    }
    expect(await countRequests()).toBe(before);

    const trimmed = await agent.post("/api/requests").send(body({ title: "  Laptop  " }));
    expect(trimmed.status, trimmed.text).toBe(201);
    const row = await t.prisma.approvalRequest.findUniqueOrThrow({ where: { id: trimmed.body.request.id } });
    expect(row.title).toBe("Laptop");
  });

  it("TEST-F03-07 / AC-F03-07: the reviewer must be an active reviewer", async () => {
    await setActive(ids.korn, false);
    try {
      const agent = await signedIn(t, ACCOUNTS.ploy);
      const before = await countRequests();
      const ACTIVE = "Choose an active reviewer.";
      const cases: Array<[string, unknown, string]> = [
        ["a requester", ids.nattapong, ACTIVE],
        ["an inactive reviewer", ids.korn, ACTIVE],
        ["an unknown id", 999999, ACTIVE],
        ["a missing reviewer", undefined, "Choose a reviewer."],
        ["an id sent as a string", String(ids.mint), "Choose a reviewer."],
        // Above the largest value of the INT4 column: refused here, not by a database error.
        ["an id one above the column maximum", 2_147_483_648, "Choose a reviewer."],
        ["an id far above it", 1e20, "Choose a reviewer."],
      ];
      for (const [label, assignedReviewerId, message] of cases) {
        const res = await agent.post("/api/requests").send(body({ assignedReviewerId }));
        expect(res.status, label).toBe(400);
        expect(res.body.error?.fields, label).toEqual({ assignedReviewerId: message });
      }
      expect(await countRequests()).toBe(before);
    } finally {
      await setActive(ids.korn, true);
    }
  });

  it("TEST-F03-08 / AC-F03-08: nobody can be the reviewer of their own request", async () => {
    const agent = await signedIn(t, ACCOUNTS.mint);
    const before = await countRequests();
    const res = await agent.post("/api/requests").send(body({ assignedReviewerId: ids.mint }));
    expect(res.status).toBe(400);
    expect(res.body.error?.fields).toEqual({
      assignedReviewerId: "You cannot be the reviewer of your own request.",
    });
    expect(await countRequests()).toBe(before);
  });
});

describe("viewing requests", () => {
  it("TEST-F03-10 / AC-F03-10: the reviewer list has active reviewers only, without the caller, sorted by name", async () => {
    const inactive = await freshUser(t, "REVIEWER", "inactive-reviewer");
    await setActive(inactive.id, false);
    try {
      const names = async (email: string) => {
        const res = await (await signedIn(t, email)).get("/api/reviewers");
        expect(res.status, res.text).toBe(200);
        for (const reviewer of res.body.reviewers) expect(Object.keys(reviewer).sort()).toEqual(["id", "name"]);
        return res.body.reviewers as Array<{ id: number; name: string }>;
      };

      const forPloy = await names(ACCOUNTS.ploy);
      const ployIds = forPloy.map((r) => r.id);
      expect(ployIds).toEqual(expect.arrayContaining([ids.korn, ids.mint]));
      expect(ployIds).not.toContain(inactive.id);
      expect(ployIds).not.toContain(ids.ploy);
      expect(ployIds).not.toContain(ids.nattapong);
      expect(forPloy.map((r) => r.name)).toEqual([...forPloy.map((r) => r.name)].sort((a, b) => a.localeCompare(b)));

      const forMint = (await names(ACCOUNTS.mint)).map((r) => r.id);
      expect(forMint).not.toContain(ids.mint);
      expect(forMint).toContain(ids.korn);
    } finally {
      await t.prisma.user.delete({ where: { id: inactive.id } });
    }
  });

  it("TEST-F03-11 / AC-F03-11: my requests are only the ones I submitted, newest first", async () => {
    const [a, b, reviewer, nobody] = await Promise.all([
      freshUser(t, "REQUESTER", "a"),
      freshUser(t, "REQUESTER", "b"),
      freshUser(t, "REVIEWER", "assigned"),
      freshUser(t, "REQUESTER", "nobody"),
    ]);
    const submit = async (email: string) => (await create(await signedIn(t, email), { assignedReviewerId: reviewer.id })).id;
    const firstOfA = await submit(a.email);
    const secondOfA = await submit(a.email);
    const ofB = await submit(b.email);

    const mine = async (email: string) => {
      const res = await (await signedIn(t, email)).get("/api/requests/mine");
      expect(res.status, res.text).toBe(200);
      return (res.body.requests as Array<{ id: number }>).map((r) => r.id);
    };
    expect(await mine(a.email)).toEqual([secondOfA, firstOfA]);
    expect(await mine(b.email)).toEqual([ofB]);
    expect(await mine(reviewer.email), "a request assigned to me is not one I submitted").toEqual([]);
    expect(await mine(nobody.email)).toEqual([]);
  });

  it("TEST-F03-12 / AC-F03-12: the requester and the assigned reviewer can open a request with its history", async () => {
    const [requester, reviewer] = await Promise.all([freshUser(t, "REQUESTER", "owner"), freshUser(t, "REVIEWER", "assigned")]);
    const { id } = await create(await signedIn(t, requester.email), { assignedReviewerId: reviewer.id });

    for (const email of [requester.email, reviewer.email]) {
      const res = await (await signedIn(t, email)).get(`/api/requests/${id}`);
      expect(res.status, `${email}: ${res.text}`).toBe(200);
      expect(Object.keys(res.body.request).sort()).toEqual(DETAIL_KEYS);
      expect(res.body.request.history).toHaveLength(1);
      expect(res.body.request.history[0]).toMatchObject({ type: "SUBMITTED", fromStatus: null, toStatus: "SUBMITTED" });
    }
  });

  it("TEST-F03-13 / AC-F03-13: anyone else gets the same 404 as for a request that does not exist", async () => {
    const [requester, reviewer, otherRequester, unrelatedReviewer] = await Promise.all([
      freshUser(t, "REQUESTER", "owner"),
      freshUser(t, "REVIEWER", "assigned"),
      freshUser(t, "REQUESTER", "other"),
      freshUser(t, "REVIEWER", "unrelated"),
    ]);
    const { id } = await create(await signedIn(t, requester.email), { assignedReviewerId: reviewer.id });

    const responses = [
      await (await signedIn(t, otherRequester.email)).get(`/api/requests/${id}`),
      await (await signedIn(t, unrelatedReviewer.email)).get(`/api/requests/${id}`),
      await (await signedIn(t, requester.email)).get("/api/requests/999999"),
      await (await signedIn(t, requester.email)).get("/api/requests/abc"),
    ];
    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
      expect(Object.keys(res.body)).toEqual(["error"]);
      expect(res.body).toEqual(responses[0].body);
    }
  });

  it.each(["patch", "put", "delete"] as const)("TEST-F03-14 / AC-F03-14: %s on a request is not a route", async (method) => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const { id } = await create(agent);
    const before = await t.prisma.approvalRequest.findUniqueOrThrow({ where: { id } });

    const res = await agent[method](`/api/requests/${id}`);
    expect(res.status).toBe(404);

    const after = await t.prisma.approvalRequest.findUniqueOrThrow({ where: { id } });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(after.title).toBe(before.title);
  });

  it("TEST-F03-21 / AC-F03-21: markup is stored and returned exactly as typed", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const title = "<script>alert(1)</script>";
    const description = "<img src=x onerror=alert(1)>";
    const created = await agent.post("/api/requests").send(body({ title, description }));
    expect(created.status, created.text).toBe(201);

    const read = await agent.get(`/api/requests/${created.body.request.id}`);
    expect(read.body.request.title).toBe(title);
    expect(read.body.request.description).toBe(description);
  });
});
