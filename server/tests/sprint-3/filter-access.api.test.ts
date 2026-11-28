import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import { INBOX, MINE, makeRequest, person, search, titles } from "./helpers.js";

// F-08 slice 1: a filter never widens what the caller may see (BR-08, BR-18, AC-F08-07).

let t: TestApp;

beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("filters and access", () => {
  it("TEST-F08-07 / AC-F08-07: nobody finds another requester's request, and the guards stay", async () => {
    const [ploy, nattapong, mint] = await Promise.all([
      person(t, "REQUESTER", "ploy"),
      person(t, "REQUESTER", "nattapong"),
      person(t, "REVIEWER", "mint"),
    ]);
    const hers = await makeRequest(t, { requesterId: ploy.user.id, reviewerId: mint.user.id, title: "Private to Ploy" });
    await makeRequest(t, { requesterId: nattapong.user.id, reviewerId: mint.user.id, title: "Own of Nattapong" });
    const asId = String(ploy.user.id);

    // The control: the filter works for the person the request belongs to.
    expect(await titles(ploy.agent, MINE, search({ q: hers.requestNumber }))).toEqual(["Private to Ploy"]);

    const his = (values: Record<string, string>) => titles(nattapong.agent, MINE, search(values));
    expect(await his({ q: hers.requestNumber })).toEqual([]);
    expect(await his({ q: "Private to Ploy" })).toEqual([]);
    expect(await his({ q: "Private to Ploy", requesterId: asId })).toEqual([]);
    expect(await his({ requesterId: asId })).toEqual(["Own of Nattapong"]);
    expect(await his({ q: "request-that-does-not-exist" })).toEqual([]);

    const noSession = await request(t.app).get(`${MINE}?${search({ q: hers.requestNumber })}`);
    expect(noSession.status).toBe(401);
    expect((await request(t.app).get(`${INBOX}?status=SUBMITTED`)).status).toBe(401);
    for (const query of ["status=SUBMITTED", "status=nonsense&from=bad"]) {
      const asRequester = await nattapong.agent.get(`${INBOX}?${query}`);
      expect(asRequester.status, asRequester.text).toBe(403);
      expect(asRequester.body.error.code).toBe("FORBIDDEN");
    }
  });
});
