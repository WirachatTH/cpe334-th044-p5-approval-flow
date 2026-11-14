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
    const { code, constraint, column } = error as pg.DatabaseError;
    return { code, constraint, column };
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
