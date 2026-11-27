import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import { resubmit, returnedScenario, scenario, sendReturn, snapshot, sqlClient } from "./helpers.js";

// TEST-F06-28 / AC-F06-28: when writing the history entry fails, the whole operation is rolled back. A temporary
// trigger in the throwaway schema refuses every new history row.

let t: TestApp;
let client: pg.Client;
beforeAll(async () => {
  t = await startTestApp();
  client = await sqlClient(t);
});
afterAll(async () => {
  await client?.end();
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

async function withBrokenHistory(run: () => Promise<void>) {
  await client.query(
    "CREATE FUNCTION refuse_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'refused by the test'; END; $$",
  );
  await client.query("CREATE TRIGGER refuse_history BEFORE INSERT ON request_event FOR EACH ROW EXECUTE FUNCTION refuse_history()");
  try {
    await run();
  } finally {
    await client.query("DROP TRIGGER refuse_history ON request_event");
    await client.query("DROP FUNCTION refuse_history()");
  }
}

describe("a failed write", () => {
  it("TEST-F06-28 / AC-F06-28: a return and a resubmission change nothing when the history cannot be written", async () => {
    const submitted = await scenario(t);
    const returned = await returnedScenario(t);
    const before = [await snapshot(t, submitted.request.id), await snapshot(t, returned.request.id)];

    await withBrokenHistory(async () => {
      for (const res of [
        await sendReturn(submitted.reviewerAgent, submitted.request.id),
        await resubmit(returned.requesterAgent, returned.request.id),
      ]) {
        expect(res.status, res.text).toBe(500);
        expect(res.body.error?.code).toBe("INTERNAL_ERROR");
      }
    });

    expect([await snapshot(t, submitted.request.id), await snapshot(t, returned.request.id)]).toEqual(before);
  });
});
