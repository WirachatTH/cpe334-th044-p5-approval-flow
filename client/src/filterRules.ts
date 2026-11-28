import { STATUS_LABEL } from "./format.js";

// The filters of a list (F-08 contract §1.4), checked on the screen before anything is sent. The API checks them again.

// In the order of the fields on the screen.
export const FILTER_NAMES = ["q", "status", "from", "to", "minAmount", "maxAmount"] as const;
export type FilterName = (typeof FILTER_NAMES)[number];
export type FilterValues = Record<FilterName, string>;
export type FilterErrors = Partial<Record<FilterName, string>>;

export const NO_FILTERS: FilterValues = { q: "", status: "", from: "", to: "", minAmount: "", maxAmount: "" };

const DATE_FORMAT = "Enter a date as YYYY-MM-DD.";
const AMOUNT_FORMAT = "Enter the amount as a number, for example 1250.50.";

export function filtersOf(params: URLSearchParams): FilterValues {
  const values = { ...NO_FILTERS };
  for (const name of FILTER_NAMES) values[name] = params.get(name) ?? "";
  return values;
}

export const hasFilters = (values: FilterValues) => FILTER_NAMES.some((name) => values[name].trim() !== "");

export const trimmed = (values: FilterValues): FilterValues => {
  const result = { ...NO_FILTERS };
  for (const name of FILTER_NAMES) result[name] = values[name].trim();
  return result;
};

function isDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text.startsWith("0000")) return false;
  const day = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === text;
}

// The amount in satang, or null when the text is not an amount.
function satang(text: string): bigint | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

// Every problem at once, for values that are already trimmed. A blank value is no filter.
export function filterErrors(values: FilterValues): FilterErrors {
  const errors: FilterErrors = {};
  if ([...values.q].length > 120) errors.q = "Search text must be 120 characters or fewer.";
  if (values.status !== "" && !Object.hasOwn(STATUS_LABEL, values.status)) errors.status = "Choose a status from the list.";

  const { from, to, minAmount, maxAmount } = values;
  if (from !== "" && !isDate(from)) errors.from = DATE_FORMAT;
  if (to !== "" && !isDate(to)) errors.to = DATE_FORMAT;
  // Dates written as YYYY-MM-DD sort as text.
  else if (to !== "" && from !== "" && !errors.from && to < from) errors.to = "The end date is before the start date.";

  const min = minAmount === "" ? null : satang(minAmount);
  const max = maxAmount === "" ? null : satang(maxAmount);
  if (minAmount !== "" && min === null) errors.minAmount = AMOUNT_FORMAT;
  if (maxAmount !== "" && max === null) errors.maxAmount = AMOUNT_FORMAT;
  else if (min !== null && max !== null && max < min) errors.maxAmount = "The maximum is below the minimum.";
  return errors;
}
