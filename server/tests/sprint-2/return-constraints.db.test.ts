import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, userIds, type TestApp } from "../sprint-1/helpers/app.js";
import { sqlClient } from "./helpers.js";

// TEST-F06-18 / AC-F06-18: the database refuses a returned request or history row that breaks the rules even when the
// API is bypassed. Every statement runs in a transaction that is rolled back; the SQLSTATE and the NAME of the
// constraint are asserted. The cases for the rules of earlier features pass already and guard them.

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

interface Row {
  decidedById: number | null;
  reason: string | null;
  category: string | null;
  revision: number;
}

const returnedRow = (change: Partial<Row> = {}): Row => ({
  decidedById: ids.mint, reason: "Add the total.", category: null, revision: 0, ...change,
});

const insertRequest = (row: Row) =>
  client.query(
    `INSERT INTO request
       (request_number, requester_id, assigned_reviewer_id, title, description, amount, status,
        decided_by_id, decided_at, decision_reason, decision_category, revision, created_at, updated_at)
     VALUES ('REQ-900301', $1, $2, 'Title', 'Description', 100, 'RETURNED'::"RequestStatus", $3,
        CASE WHEN $3::int IS NULL THEN NULL ELSE now() END, $4, $5::rejection_category, $6, now(), now())
     RETURNING id`,
    [ids.ploy, ids.mint, row.decidedById, row.reason, row.category, row.revision],
  );

const insertEntry = async (reason: string | null, category: string | null = null) => {
  const request = await insertRequest(returnedRow());
  return client.query(
    `INSERT INTO request_event (request_id, actor_id, type, from_status, to_status, reason, category, created_at)
     VALUES ($1, $2, 'RETURNED'::"RequestEventType", 'SUBMITTED'::"RequestStatus", 'RETURNED'::"RequestStatus", $3,
        $4::rejection_category, now())
     RETURNING id`,
    [request.rows[0].id, ids.mint, reason, category],
  );
};

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

describe("return constraints", () => {
  it("TEST-F06-18 (controls): a returned request and its history row with a comment are accepted", async () => {
    expect(await refusal(() => insertEntry("Add the total."))).toBeUndefined();
  });

  it.each([
    ["a returned request without a comment", () => insertRequest(returnedRow({ reason: null })), check("request_return_comment")],
    ["a returned request with a blank comment", () => insertRequest(returnedRow({ reason: "   " })), check("request_return_comment")],
    ["a returned request without a decider", () => insertRequest(returnedRow({ decidedById: null })), check("request_decision_fields")],
    ["a category on a returned request", () => insertRequest(returnedRow({ category: "BUDGET" })), check("request_category_only_on_rejection")],
    ["a negative revision", () => insertRequest(returnedRow({ revision: -1 })), check("request_revision_not_negative")],
    ["a return in the history without a comment", () => insertEntry(null), check("request_event_return_comment")],
    ["a return in the history with a blank comment", () => insertEntry("  "), check("request_event_return_comment")],
    ["a category on a return in the history", () => insertEntry("Add it.", "BUDGET"), check("request_event_category_only_on_rejection")],
    [
      "a change of an existing history row",
      async () => {
        const entry = await insertEntry("Add the total.");
        await client.query("UPDATE request_event SET reason = 'Changed' WHERE id = $1", [entry.rows[0].id]);
      },
      { code: "P0001" },
    ],
  ])("TEST-F06-18 / AC-F06-18: %s is refused by the database", async (_label, run, expected) => {
    expect(await refusal(run)).toMatchObject(expected);
  });
});
