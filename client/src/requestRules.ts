// The rules for the content of a request (F-03 contract §1.4), checked on the screen for quick feedback when a request
// is submitted and when it is resubmitted. The API checks them again.

export interface ContentValues {
  title: string;
  description: string;
  amount: string;
}

export type ContentErrors = Partial<Record<keyof ContentValues, string>>;

export function contentErrors(values: ContentValues): ContentErrors {
  const errors: ContentErrors = {};
  const title = values.title.trim();
  if (title === "") errors.title = "Enter a title.";
  else if ([...title].length > 120) errors.title = "Title must be 120 characters or fewer.";

  const description = values.description.trim();
  if (description === "") errors.description = "Enter a description.";
  else if ([...description].length > 2000) errors.description = "Description must be 2,000 characters or fewer.";

  const amount = values.amount.trim();
  if (amount === "") {
    errors.amount = "Enter an amount.";
  } else if (!/^\d{1,7}(\.\d{1,2})?$/.test(amount)) {
    errors.amount = "Enter the amount as a number, for example 1250.50.";
  } else {
    const [whole, fraction = ""] = amount.split(".");
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    if (cents <= 0n) errors.amount = "Enter an amount greater than 0.";
    else if (cents > 100_000_000n) errors.amount = "Enter an amount of at most 1,000,000.00 THB.";
  }
  return errors;
}
