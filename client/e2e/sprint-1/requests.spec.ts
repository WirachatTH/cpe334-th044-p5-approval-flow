import { expect, test } from "@playwright/test";

// F-03 end-to-end: a requester submits a request through the real screens, and finds it again after a reload
// (contract §3, AC-F03-20). Needs the API running on a seeded database, as in auth.spec.ts.

const PASSWORD = process.env.DEMO_USER_PASSWORD;

test("TEST-F03-20 / AC-F03-20: a submitted request is listed as SUBMITTED, before and after a reload", async ({ page }) => {
  expect(PASSWORD, "DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)").toBeTruthy();
  const title = `E2E request ${Date.now()}`;

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill("ploy.requester@example.com");
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/requests$/);

  await page.getByRole("navigation").getByRole("link", { name: "New Request" }).click();
  await expect(page.getByRole("heading", { name: "New Request" })).toBeVisible();
  await expect(page.getByLabel("Title"), "the New Request form is shown").toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Created by the end-to-end test.");
  await page.getByLabel("Amount (THB)").fill("1250.50");
  await page.getByLabel("Reviewer").selectOption({ label: "Mint Chaiyaporn" });
  await page.getByRole("button", { name: "Submit request" }).click();

  await expect(page).toHaveURL(/\/requests\/\d+$/);
  await expect(page.getByText(/^Request REQ-\d{6} submitted\.$/)).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "My Requests" }).click();
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row.getByText("Submitted", { exact: true })).toBeVisible();

  await page.reload();
  const again = page.getByRole("row").filter({ hasText: title });
  await expect(again).toBeVisible();
  await expect(again.getByText("Submitted", { exact: true })).toBeVisible();
});
