import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { signedIn, startTestApp, userIds, ACCOUNTS, type TestApp } from "../sprint-1/helpers/app.js";
import { decide, sqlClient } from "./helpers.js";

// TEST-F07-15 and TEST-F07-20: the database rules of the second approval, and rows written before the migration. The
// refused statements run in a transaction that is rolled back; the SQLSTATE and the NAME of the constraint are asserted.

let t: TestApp;
let client: pg.Client;
let ids: Awaited<ReturnType<typeof userIds>>;

beforeAll(async () => {
  t = await startTestApp();
  ids = await userIds(t);
  client = await sqlClient(t);
});
afterAll(async () => {
  await client?.end();
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

interface Row {
  status: string;
  decidedById: number | null;
  reason: string | null;
  firstById: number | null;
  firstAt: boolean;
}

let number = 900400;

// A request of Ploy assigned to Mint. decided_at is set exactly when there is a decider.
const insert = (row: Row, amount = "250000.00") => {
  number += 1;
  return client.query(
    `INSERT INTO request
       (request_number, requester_id, assigned_reviewer_id, title, description, amount, status, decided_by_id,
        decided_at, decision_reason, decision_category, first_approved_by_id, first_approved_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'Title', 'Description', $4::numeric, $5::"RequestStatus", $6,
        CASE WHEN $6::int IS NULL THEN NULL ELSE now() END, $7, NULL, $8, CASE WHEN $9 THEN now() ELSE NULL END, now(), now())
     RETURNING id`,
    [`REQ-${number}`, ids.ploy, ids.mint, amount, row.status, row.decidedById, row.reason, row.firstById, row.firstAt],
  );
};

const waiting = (): Row => ({ status: "AWAITING_SECOND_APPROVAL", decidedById: ids.mint, reason: null, firstById: ids.mint, firstAt: true });
const approvedByTwo = (): Row => ({ status: "APPROVED", decidedById: ids.korn, reason: null, firstById: ids.mint, firstAt: true });
const approvedEarlier = (): Row => ({ status: "APPROVED", decidedById: ids.mint, reason: null, firstById: null, firstAt: false });

async function refusal(run: () => Promise<unknown>) {
  await client.query("BEGIN");
  try {
    await run();
    return undefined;
  } catch (error) {
    const { code, constraint, message } = error as pg.DatabaseError;
    return { code, constraint, message };
  } finally {
    await client.query("ROLLBACK");
  }
}

const check = (constraint: string) => ({ code: "23514", constraint });

describe("second approval constraints", () => {
  it.each([
    ["a waiting request", waiting],
    ["a request approved by two", approvedByTwo],
    ["a request approved before the second approval existed", approvedEarlier],
  ])("TEST-F07-15 (control): %s is accepted", async (_label, row) => {
    expect(await refusal(() => insert(row()))).toBeUndefined();
  });

  it.each([
    ["a first approver without a time", () => ({ ...approvedByTwo(), firstAt: false }), "request_first_approval_fields"],
    ["a waiting request without a first approval", () => ({ ...waiting(), firstById: null, firstAt: false }), "request_awaiting_second_approval"],
    ["a waiting request decided by someone else", () => ({ ...waiting(), decidedById: ids.korn }), "request_awaiting_second_approval"],
    ["one person as both approvers", () => ({ ...approvedByTwo(), decidedById: ids.mint }), "request_second_approver_differs"],
    ["one person as both approvers of a rejected request", () => ({ ...approvedByTwo(), status: "REJECTED", decidedById: ids.mint, reason: "Already ordered last week." }), "request_second_approver_differs"],
    ["the requester as decider", () => ({ ...approvedEarlier(), decidedById: ids.ploy }), "request_decider_not_requester"],
    ["a first approval on a submitted request", () => ({ status: "SUBMITTED", decidedById: null, reason: null, firstById: ids.mint, firstAt: true }), "request_first_approval_scope"],
    ["a first approval on a returned request", () => ({ status: "RETURNED", decidedById: ids.mint, reason: "Add it.", firstById: ids.mint, firstAt: true }), "request_first_approval_scope"],
    ["the requester as first approver", () => ({ ...approvedByTwo(), firstById: ids.ploy }), "request_first_approval_scope"],
  ])("TEST-F07-15 / AC-F07-15: %s is refused by the database", async (_label, row, constraint) => {
    expect(await refusal(() => insert(row()))).toMatchObject(check(constraint));
  });

  it("TEST-F07-20 / AC-F07-20: earlier approvals stay, and an earlier submitted request now needs two", async () => {
    const approved = await insert(approvedEarlier());
    const submitted = await insert({ status: "SUBMITTED", decidedById: null, reason: null, firstById: null, firstAt: false });
    const mint = await signedIn(t, ACCOUNTS.mint);

    const old = await mint.get(`/api/requests/${approved.rows[0].id}`);
    expect(old.status, old.text).toBe(200);
    expect(old.body.request).toMatchObject({ status: "APPROVED", firstApproval: null });

    const res = await decide(mint, submitted.rows[0].id, { decision: "APPROVE" });
    expect(res.status, res.text).toBe(200);
    expect(res.body.request.status).toBe("AWAITING_SECOND_APPROVAL");
  });
});
