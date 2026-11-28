import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import { INBOX, MINE, makeRequest, person, search, titles } from "./helpers.js";

// F-08 slice 1: filtering and search on My Requests and the Review Inbox (contract §1.4, AC-F08-01 to 05 and 08).

let t: TestApp;

beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

// A requester with their own reviewer, and a way to write their requests.
async function requesterWithReviewer() {
  const requester = await person(t, "REQUESTER", "ploy");
  const reviewer = await person(t, "REVIEWER", "mint");
  const add = (title: string, more: Record<string, string> = {}) =>
    makeRequest(t, { requesterId: requester.user.id, reviewerId: reviewer.user.id, title, ...more });
  return { requester, reviewer, add };
}

describe("filters on My Requests", () => {
  it("TEST-F08-01 / AC-F08-01: each status lists only that status, newest first", async () => {
    const { requester, add } = await requesterWithReviewer();
    await add("submitted older", { createdAt: "2026-11-01T03:00:00.000Z" });
    await add("approved", { status: "APPROVED" });
    await add("rejected", { status: "REJECTED" });
    await add("returned", { status: "RETURNED" });
    await add("waiting", { status: "AWAITING_SECOND_APPROVAL" });
    await add("submitted newer", { createdAt: "2026-11-02T03:00:00.000Z" });

    const of = (status: string) => titles(requester.agent, MINE, search({ status }));
    expect(await of("SUBMITTED")).toEqual(["submitted newer", "submitted older"]);
    expect(await of("APPROVED")).toEqual(["approved"]);
    expect(await of("REJECTED")).toEqual(["rejected"]);
    expect(await of("RETURNED")).toEqual(["returned"]);
    expect(await of("AWAITING_SECOND_APPROVAL")).toEqual(["waiting"]);
  });

  it("TEST-F08-02 / AC-F08-02: search matches part of a number or a title, ignoring case", async () => {
    const { requester, add } = await requesterWithReviewer();
    const lab = await add("Lab Supplies", { createdAt: "2026-11-01T03:00:00.000Z" });
    await add("Projector bulbs", { createdAt: "2026-11-02T03:00:00.000Z" });

    const find = (q: string) => titles(requester.agent, MINE, search({ q }));
    expect(await find("lab supp")).toEqual(["Lab Supplies"]);
    expect(await find("  SUPPLIES  ")).toEqual(["Lab Supplies"]);
    expect(await find(lab.requestNumber.slice(4))).toEqual(["Lab Supplies"]);
    expect(await find(lab.requestNumber.toLowerCase())).toEqual(["Lab Supplies"]);
    expect(await find("o")).toEqual(["Projector bulbs"]);
    expect(await find("nothing like this")).toEqual([]);
  });

  it("TEST-F08-02 / AC-F08-02: the characters %, _, and \\ match only themselves", async () => {
    const { requester, add } = await requesterWithReviewer();
    await add("Discount 50% voucher", { createdAt: "2026-11-01T03:00:00.000Z" });
    await add("Discount 500 voucher", { createdAt: "2026-11-02T03:00:00.000Z" });
    await add("Cable snake_case", { createdAt: "2026-11-03T03:00:00.000Z" });
    await add("Cable snakeXcase", { createdAt: "2026-11-04T03:00:00.000Z" });
    await add("Drive C:\\data", { createdAt: "2026-11-05T03:00:00.000Z" });
    await add("Drive C:data", { createdAt: "2026-11-06T03:00:00.000Z" });

    const find = (q: string) => titles(requester.agent, MINE, search({ q }));
    expect(await find("50%")).toEqual(["Discount 50% voucher"]);
    expect(await find("%")).toEqual(["Discount 50% voucher"]);
    expect(await find("snake_case")).toEqual(["Cable snake_case"]);
    expect(await find("_")).toEqual(["Cable snake_case"]);
    expect(await find("C:\\data")).toEqual(["Drive C:\\data"]);
    expect(await find("\\")).toEqual(["Drive C:\\data"]);
    // No stored text can hold this character, so it matches nothing.
    expect(await find("Drive\u0000")).toEqual([]);
  });

  it("TEST-F08-03 / AC-F08-03: a day runs from midnight to midnight in Bangkok", async () => {
    const { requester, add } = await requesterWithReviewer();
    await add("last moment of the day before", { createdAt: "2026-11-09T16:59:59.999Z" });
    await add("first moment of the day", { createdAt: "2026-11-09T17:00:00.000Z" });
    await add("last moment of the day", { createdAt: "2026-11-10T16:59:59.999Z" });
    await add("first moment of the day after", { createdAt: "2026-11-10T17:00:00.000Z" });

    const range = (values: Record<string, string>) => titles(requester.agent, MINE, search(values));
    expect(await range({ from: "2026-11-10", to: "2026-11-10" })).toEqual([
      "last moment of the day",
      "first moment of the day",
    ]);
    expect(await range({ from: "2026-11-10" })).toEqual([
      "first moment of the day after",
      "last moment of the day",
      "first moment of the day",
    ]);
    expect(await range({ to: "2026-11-10" })).toEqual([
      "last moment of the day",
      "first moment of the day",
      "last moment of the day before",
    ]);
    expect(await range({ from: "0001-01-01", to: "9999-12-31" })).toHaveLength(4);
    expect(await range({ from: "2030-01-01" })).toEqual([]);
  });

  it("TEST-F08-04 / AC-F08-04: both amount limits are included", async () => {
    const { requester, add } = await requesterWithReviewer();
    await add("99.99", { amount: "99.99", createdAt: "2026-11-01T03:00:00.000Z" });
    await add("100.00", { amount: "100.00", createdAt: "2026-11-02T03:00:00.000Z" });
    await add("200.00", { amount: "200.00", createdAt: "2026-11-03T03:00:00.000Z" });
    await add("200.01", { amount: "200.01", createdAt: "2026-11-04T03:00:00.000Z" });

    const range = (values: Record<string, string>) => titles(requester.agent, MINE, search(values));
    expect(await range({ minAmount: "100", maxAmount: "200.00" })).toEqual(["200.00", "100.00"]);
    expect(await range({ minAmount: "200.01" })).toEqual(["200.01"]);
    expect(await range({ maxAmount: "99.99" })).toEqual(["99.99"]);
    expect(await range({ maxAmount: "0" })).toEqual([]);
    expect(await range({ minAmount: "0", maxAmount: "9999999.99" })).toHaveLength(4);
  });

  it("TEST-F08-05 / AC-F08-05: all filters must match together", async () => {
    const { requester, add } = await requesterWithReviewer();
    const match = { status: "APPROVED", amount: "150.00", createdAt: "2026-11-10T03:00:00.000Z" };
    await add("Combined match", match);
    await add("Other words", match);
    await add("Combined wrong status", { ...match, status: "REJECTED" });
    await add("Combined too cheap", { ...match, amount: "99.00" });
    await add("Combined too dear", { ...match, amount: "201.00" });
    await add("Combined too early", { ...match, createdAt: "2026-11-08T03:00:00.000Z" });
    await add("Combined too late", { ...match, createdAt: "2026-11-12T03:00:00.000Z" });

    const all = {
      q: "combined", status: "APPROVED", from: "2026-11-09", to: "2026-11-11", minAmount: "100", maxAmount: "200",
    };
    expect(await titles(requester.agent, MINE, search(all))).toEqual(["Combined match"]);
    expect(await titles(requester.agent, MINE, search({ ...all, status: "RETURNED" }))).toEqual([]);
  });
});

describe("filters on the Review Inbox", () => {
  it("TEST-F08-08 / AC-F08-08: the filtered inbox holds only matching requests of the inbox, oldest first", async () => {
    const [requester, mint, other] = await Promise.all([
      person(t, "REQUESTER", "ploy"),
      person(t, "REVIEWER", "mint"),
      person(t, "REVIEWER", "korn"),
    ]);
    const base = { requesterId: requester.user.id, reviewerId: mint.user.id };
    const waitingForMint = {
      ...base, reviewerId: other.user.id, status: "AWAITING_SECOND_APPROVAL" as const,
    };
    // In Mint's inbox. The amounts around 7771 are used by this test alone.
    await makeRequest(t, { ...base, title: "Inbox8 first", amount: "7771.00", createdAt: "2026-10-01T03:00:00.000Z" });
    await makeRequest(t, {
      ...waitingForMint, title: "Inbox8 second", amount: "7772.00", createdAt: "2026-10-02T03:00:00.000Z",
    });
    await makeRequest(t, { ...base, title: "Inbox8 third", amount: "7773.00", createdAt: "2026-10-03T03:00:00.000Z" });
    // Matching the same filters, but not in Mint's inbox.
    const hidden = { amount: "7772.00", createdAt: "2026-10-02T04:00:00.000Z" };
    await makeRequest(t, { ...base, ...hidden, reviewerId: other.user.id, title: "Inbox8 of another reviewer" });
    await makeRequest(t, {
      ...base, ...hidden, status: "AWAITING_SECOND_APPROVAL", title: "Inbox8 approved first by Mint",
    });
    await makeRequest(t, {
      ...waitingForMint, ...hidden, requesterId: mint.user.id, title: "Inbox8 submitted by Mint",
    });
    await makeRequest(t, { ...base, ...hidden, status: "APPROVED", title: "Inbox8 decided" });

    const inbox = (values: Record<string, string>) => titles(mint.agent, INBOX, search(values));
    expect(await inbox({ q: "inbox8" })).toEqual(["Inbox8 first", "Inbox8 second", "Inbox8 third"]);
    expect(await inbox({ q: "inbox8", status: "SUBMITTED" })).toEqual(["Inbox8 first", "Inbox8 third"]);
    expect(await inbox({ q: "inbox8", status: "AWAITING_SECOND_APPROVAL" })).toEqual(["Inbox8 second"]);
    expect(await inbox({ minAmount: "7771", maxAmount: "7773" })).toEqual([
      "Inbox8 first", "Inbox8 second", "Inbox8 third",
    ]);
    expect(await inbox({ minAmount: "7772", maxAmount: "7772" })).toEqual(["Inbox8 second"]);
    expect(await inbox({ q: "inbox8", from: "2026-10-02", to: "2026-10-02" })).toEqual(["Inbox8 second"]);
    expect(await inbox({ status: "APPROVED" })).toEqual([]);
  });
});
