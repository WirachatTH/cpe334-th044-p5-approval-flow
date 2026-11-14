import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, userIds, type TestApp } from "./helpers/app.js";

// TEST-F03-09 / AC-F03-09: the database refuses data that breaks the rules even when the API is bypassed. Every
// insert runs in a transaction that is rolled back. A valid row (the control) is inserted first, then the same row
// with ONE column changed, and the test asserts the SQLSTATE code and the NAME of the constraint.
//
// It uses the pg driver, not Prisma's $executeRaw: Prisma's raw-query error shows only the DETAIL line ("Failing row
// contains ..."), which has no constraint name.

let t: TestApp;
let ids: Awaited<ReturnType<typeof userIds>>;
let client: pg.Client;

beforeAll(async () => {
  t = await startTestApp();
  ids = await userIds(t);

  // The throwaway schema is in the URL's `schema` parameter, which pg does not understand: use it as search_path.
  const url = new URL(t.config.databaseUrl);
  const schema = url.searchParams.get("schema")!;
  url.searchParams.delete("schema");
  client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  await client.query(`SET search_path TO "${schema}"`);
});
afterAll(async () => {
  await client?.end();
  await t?.drop();
});

interface Row {
  requestNumber: string;
  requesterId: number;
  reviewerId: number;
  amount: string | null;
}

// Every NOT NULL column is supplied, including updated_at, which Prisma sets in the application and so has no
// database default.
const insert = (row: Row) =>
  client.query(
    `INSERT INTO request
       (request_number, requester_id, assigned_reviewer_id, title, description, amount, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Title', 'Description', $4::numeric, 'SUBMITTED'::"RequestStatus", now(), now())`,
    [row.requestNumber, row.requesterId, row.reviewerId, row.amount],
  );

const valid = (): Row => ({ requestNumber: "REQ-900001", requesterId: ids.ploy, reviewerId: ids.mint, amount: "100.00" });

async function inRolledBackTransaction(run: () => Promise<unknown>): Promise<void> {
  await client.query("BEGIN");
  try {
    await run();
  } finally {
    await client.query("ROLLBACK");
  }
}

// What the database reported, or undefined when it accepted the statement.
async function refusal(run: () => Promise<unknown>) {
  try {
    await inRolledBackTransaction(run);
  } catch (error) {
    const { code, constraint, column, message } = error as pg.DatabaseError;
    return { code, constraint, column, message };
  }
  return undefined;
}

describe("request constraints", () => {
  it("TEST-F03-09 (control): a valid row is accepted", async () => {
    await expect(inRolledBackTransaction(() => insert(valid()))).resolves.toBeUndefined();
  });

  const cases: Array<[string, (row: Row) => Row, Record<string, string>]> = [
    ["amount 0", (row) => ({ ...row, amount: "0" }), { code: "23514", constraint: "request_amount_range" }],
    ["amount 1000000.01", (row) => ({ ...row, amount: "1000000.01" }), { code: "23514", constraint: "request_amount_range" }],
    ["amount NULL", (row) => ({ ...row, amount: null }), { code: "23502", column: "amount" }],
    [
      "the reviewer is the requester",
      (row) => ({ ...row, reviewerId: row.requesterId }),
      { code: "23514", constraint: "request_reviewer_not_requester" },
    ],
  ];

  it.each(cases)("TEST-F03-09 / AC-F03-09: %s is refused by the database", async (_label, change, expected) => {
    expect(await refusal(() => insert(change(valid())))).toMatchObject(expected);
  });

  it("TEST-F03-09 / AC-F03-09: a duplicate request number is refused by the database", async () => {
    const duplicate = await refusal(async () => {
      await insert(valid());
      await insert(valid());
    });
    expect(duplicate).toMatchObject({ code: "23505", constraint: "request_number_unique" });
  });
});

// F-04 / AC-F04-14: the rules about decisions and about history. They were added by F-03's add_request_rules
// migration, so these tests pass when first written: they guard against a regression and are not red evidence.

interface Decided {
  requestNumber: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  decidedById: number | null;
  decidedAt: Date | null;
  decisionReason: string | null;
}

// A full request row: every NOT NULL column, plus the decision columns.
const insertDecided = (row: Decided) =>
  client.query(
    `INSERT INTO request
       (request_number, requester_id, assigned_reviewer_id, title, description, amount, status,
        decided_by_id, decided_at, decision_reason, created_at, updated_at)
     VALUES ($1, $2, $3, 'Title', 'Description', 100, $4::"RequestStatus", $5, $6, $7, now(), now())
     RETURNING id`,
    [row.requestNumber, ids.ploy, ids.mint, row.status, row.decidedById, row.decidedAt, row.decisionReason],
  );

const validSubmitted = (): Decided => ({
  requestNumber: "REQ-900101",
  status: "SUBMITTED",
  decidedById: null,
  decidedAt: null,
  decisionReason: null,
});

const validRejected = (): Decided => ({
  requestNumber: "REQ-900102",
  status: "REJECTED",
  decidedById: ids.mint,
  decidedAt: new Date(),
  decisionReason: "Over budget.",
});

// A valid history row for a request.
const insertEvent = (requestId: number) =>
  client.query(
    `INSERT INTO request_event (request_id, actor_id, type, from_status, to_status, reason, created_at)
     VALUES ($1, $2, 'SUBMITTED'::"RequestEventType", NULL, 'SUBMITTED'::"RequestStatus", NULL, now())
     RETURNING id`,
    [requestId, ids.ploy],
  );

describe("decision constraints and append-only history", () => {
  it("TEST-F04-14 (controls): a valid submitted row, a valid rejected row, and a history row are accepted", async () => {
    await expect(
      inRolledBackTransaction(async () => {
        const submitted = await insertDecided(validSubmitted());
        await insertDecided(validRejected());
        await insertEvent(submitted.rows[0].id);
      }),
    ).resolves.toBeUndefined();
  });

  // Each case starts from a valid row built inside the test, because the user ids exist only after beforeAll.
  const decisionFields = { code: "23514", constraint: "request_decision_fields" };
  const rejectionReason = { code: "23514", constraint: "request_rejection_reason" };
  const cases: Array<[string, "submitted" | "rejected", (row: Decided) => Decided, Record<string, string>]> = [
    ["(a) a rejection with no reason", "rejected", (r) => ({ ...r, decisionReason: null }), rejectionReason],
    ["(b) a rejection with a blank reason", "rejected", (r) => ({ ...r, decisionReason: "   " }), rejectionReason],
    ["(c) an approval with a date and no decider", "rejected", (r) => ({ ...r, status: "APPROVED", decidedById: null, decisionReason: null }), decisionFields],
    ["(d) an approval with a decider and no date", "rejected", (r) => ({ ...r, status: "APPROVED", decidedAt: null, decisionReason: null }), decisionFields],
    ["(e) a submitted request with a decider", "submitted", (r) => ({ ...r, decidedById: ids.mint }), decisionFields],
    ["(f) a submitted request with a reason", "submitted", (r) => ({ ...r, decisionReason: "Early." }), decisionFields],
  ];

  it.each(cases)("TEST-F04-14 / AC-F04-14: %s is refused by the database", async (_label, kind, change, expected) => {
    const base = kind === "rejected" ? validRejected() : validSubmitted();
    expect(await refusal(() => insertDecided(change(base)))).toMatchObject(expected);
  });

  it.each([
    ["(g) an UPDATE", "UPDATE request_event SET reason = 'edited' WHERE id = $1"],
    ["(h) a DELETE", "DELETE FROM request_event WHERE id = $1"],
  ])("TEST-F04-14 / AC-F04-14: %s of a history row is refused by the trigger", async (_label, statement) => {
    const outcome = await refusal(async () => {
      const request = await insertDecided(validSubmitted());
      const event = await insertEvent(request.rows[0].id);
      await client.query(statement, [event.rows[0].id]);
    });
    expect(outcome).toMatchObject({ code: "P0001" });
    expect(outcome?.message).toContain("request_event is append-only");
  });

  it("TEST-F04-14 / AC-F04-14: none of the refused statements left a row behind", async () => {
    const counts = await client.query(
      "SELECT (SELECT count(*) FROM request)::int AS requests, (SELECT count(*) FROM request_event)::int AS events",
    );
    expect(counts.rows[0]).toEqual({ requests: 0, events: 0 });
  });
});
