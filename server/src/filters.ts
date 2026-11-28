import { Prisma, RequestStatus } from "@prisma/client";

// The filters of a list, read from its query string (F-08 contract §1.4). Every problem is reported at once. The result
// is a list of conditions that the caller combines with its own record scope with AND, so that a filter can only make a
// list smaller (BR-18). A parameter that is not named here is ignored.

const NAMES = ["q", "status", "from", "to", "minAmount", "maxAmount"] as const;
type Name = (typeof NAMES)[number];

const TEXT_MAX = 120;
const TEXT_TOO_LONG = "Search text must be 120 characters or fewer.";
const CHOOSE_STATUS = "Choose a status from the list.";
const DATE_FORMAT = "Enter a date as YYYY-MM-DD.";
const DATE_ORDER = "The end date is before the start date.";
const AMOUNT_FORMAT = "Enter the amount as a number, for example 1250.50.";
const AMOUNT_ORDER = "The maximum is below the minimum.";
const ONCE = "Give this filter once.";

const STATUSES: readonly string[] = Object.values(RequestStatus);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type Filters =
  | { ok: true; where: Prisma.ApprovalRequestWhereInput[] }
  | { ok: false; fields: Record<string, string> };

// The first instant of a calendar day in Asia/Bangkok (UTC+7, without daylight saving), or null when the text is not a
// real date written as YYYY-MM-DD.
function startOfDay(text: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text.startsWith("0000")) return null;
  const midnight = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== text) return null;
  return midnight.getTime() - 7 * HOUR;
}

const amountOf = (text: string) => (/^\d{1,7}(\.\d{1,2})?$/.test(text) ? new Prisma.Decimal(text) : null);

// The number or the title holds the text, ignoring case. The wildcards of LIKE are escaped, so they match themselves.
function textCondition(text: string): Prisma.ApprovalRequestWhereInput {
  // No stored text can hold NUL, and the database refuses it in a query: it matches nothing.
  if (text.includes("\u0000")) return { id: { in: [] } };
  const contains = text.replace(/[\\%_]/g, "\\$&");
  return {
    OR: [
      { requestNumber: { contains, mode: "insensitive" } },
      { title: { contains, mode: "insensitive" } },
    ],
  };
}

export function readFilters(query: Record<string, unknown>): Filters {
  const fields: Record<string, string> = {};
  const given: Partial<Record<Name, string>> = {};
  for (const name of NAMES) {
    const value = query[name];
    if (value === undefined) continue;
    // Given twice, or written as a list or an object.
    if (typeof value !== "string") fields[name] = ONCE;
    else if (value.trim() !== "") given[name] = value;
  }

  const where: Prisma.ApprovalRequestWhereInput[] = [];

  if (given.q !== undefined) {
    const text = given.q.trim();
    if ([...text].length > TEXT_MAX) fields.q = TEXT_TOO_LONG;
    else where.push(textCondition(text));
  }

  if (given.status !== undefined) {
    if (!STATUSES.includes(given.status)) fields.status = CHOOSE_STATUS;
    else where.push({ status: given.status as RequestStatus });
  }

  const from = given.from === undefined ? undefined : startOfDay(given.from);
  const to = given.to === undefined ? undefined : startOfDay(given.to);
  if (from === null) fields.from = DATE_FORMAT;
  if (to === null) fields.to = DATE_FORMAT;
  else if (typeof from === "number" && typeof to === "number" && to < from) fields.to = DATE_ORDER;
  // Both days are included: from the start of the first one to before the start of the day after the last one.
  if (typeof from === "number") where.push({ createdAt: { gte: new Date(from) } });
  if (typeof to === "number") where.push({ createdAt: { lt: new Date(to + DAY) } });

  const min = given.minAmount === undefined ? undefined : amountOf(given.minAmount);
  const max = given.maxAmount === undefined ? undefined : amountOf(given.maxAmount);
  if (min === null) fields.minAmount = AMOUNT_FORMAT;
  if (max === null) fields.maxAmount = AMOUNT_FORMAT;
  else if (min && max && max.lt(min)) fields.maxAmount = AMOUNT_ORDER;
  if (min) where.push({ amount: { gte: min } });
  if (max) where.push({ amount: { lte: max } });

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, where };
}
