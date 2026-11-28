import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../sprint-1/helpers/app.js";
import { INBOX, MINE, makeRequest, person, search, titles, type Agent } from "./helpers.js";

// F-08 slice 1: the query parameters that are refused, and those that are ignored (contract §1.4, AC-F08-06 and 09).

const TEXT = "Search text must be 120 characters or fewer.";
const STATUS = "Choose a status from the list.";
const DATE = "Enter a date as YYYY-MM-DD.";
const DATE_ORDER = "The end date is before the start date.";
const AMOUNT = "Enter the amount as a number, for example 1250.50.";
const AMOUNT_ORDER = "The maximum is below the minimum.";
const TWICE = "Give this filter once.";

const INVALID: [string, string, Record<string, string>][] = [
  ["a search text of 121 characters", search({ q: "x".repeat(121) }), { q: TEXT }],
  ["an unknown status", "status=DONE", { status: STATUS }],
  ["a status in small letters", "status=submitted", { status: STATUS }],
  ["a date without two digits", "from=2026-2-1", { from: DATE }],
  ["a date that does not exist", "from=2026-02-30", { from: DATE }],
  ["a word as a date", "to=today", { to: DATE }],
  ["the year 0000", "from=0000-01-01", { from: DATE }],
  ["an end before the start", "from=2026-11-10&to=2026-11-09", { to: DATE_ORDER }],
  ["a negative amount", "minAmount=-1", { minAmount: AMOUNT }],
  ["an amount with a comma", search({ minAmount: "1,000" }), { minAmount: AMOUNT }],
  ["an amount with three decimals", "maxAmount=1.234", { maxAmount: AMOUNT }],
  ["an amount of eight digits", "maxAmount=12345678", { maxAmount: AMOUNT }],
  ["a maximum below the minimum", "minAmount=200&maxAmount=100.99", { maxAmount: AMOUNT_ORDER }],
  [
    "several problems at once",
    search({ q: "x".repeat(121), status: "x", from: "bad", to: "bad", minAmount: "a", maxAmount: "b" }),
    { q: TEXT, status: STATUS, from: DATE, to: DATE, minAmount: AMOUNT, maxAmount: AMOUNT },
  ],
];

const NOT_ONE_VALUE: [string, string, string][] = [
  ["q given twice", "q=a&q=b", "q"],
  ["status given twice", "status=SUBMITTED&status=APPROVED", "status"],
  ["from given twice", "from=2026-11-01&from=2026-11-02", "from"],
  ["to given twice", "to=2026-11-01&to=2026-11-02", "to"],
  ["minAmount given twice", "minAmount=1&minAmount=2", "minAmount"],
  ["maxAmount given twice", "maxAmount=1&maxAmount=2", "maxAmount"],
  ["a blank value given twice", "q=&q=", "q"],
  ["a status written as a list", "status[]=APPROVED", "status"],
  ["a search text written as an object", "q[a]=x", "q"],
  ["a deeply nested object", "from[a][b][c][d][e][f][g]=x", "from"],
];

let t: TestApp;
let requester: Agent;
let reviewer: Agent;
// Both lists hold one request, so that an ignored parameter shows it and a refused one cannot.
const TITLE = "Validation request";

beforeAll(async () => {
  t = await startTestApp();
  const ploy = await person(t, "REQUESTER", "ploy");
  const mint = await person(t, "REVIEWER", "mint");
  await makeRequest(t, { requesterId: ploy.user.id, reviewerId: mint.user.id, title: TITLE });
  requester = ploy.agent;
  reviewer = mint.agent;
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const lists = () => [[requester, MINE], [reviewer, INBOX]] as const;

async function expectRefusal(query: string, fields: Record<string, string>) {
  for (const [agent, path] of lists()) {
    const res = await agent.get(`${path}?${query}`);
    expect(res.status, `${path}?${query}: ${res.text}`).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toEqual(fields);
    expect(res.body.requests).toBeUndefined();
  }
}

describe("filter validation", () => {
  it.each(INVALID)("TEST-F08-06 / AC-F08-06: %s is refused on both lists", async (_label, query, fields) => {
    await expectRefusal(query, fields);
  });

  it("TEST-F08-06 / AC-F08-06 (control): a search text of 120 characters is accepted", async () => {
    for (const [agent, path] of lists()) {
      expect(await titles(agent, path, search({ q: "x".repeat(120) }))).toEqual([]);
    }
  });

  it("TEST-F08-09 / AC-F08-09: blank and unknown parameters are ignored", async () => {
    for (const [agent, path] of lists()) {
      const blank = "q=&status=%20&from=&to=%20%20&minAmount=&maxAmount=";
      expect(await titles(agent, path, blank)).toEqual([TITLE]);
      expect(await titles(agent, path, "sort=amount&requesterId=999999&foo[]=bar&foo[]=baz")).toEqual([TITLE]);
    }
  });

  it.each(NOT_ONE_VALUE)("TEST-F08-09 / AC-F08-09: %s is refused, never a server error", async (_label, query, name) => {
    await expectRefusal(query, { [name]: TWICE });
  });
});
