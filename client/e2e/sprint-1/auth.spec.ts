import { expect, test, type Page } from "@playwright/test";

// F-01 end-to-end: the real screens, API, and database (contract §3, AC-F01-17 and 18).
// Needs the API running on a seeded database. DEMO_USER_PASSWORD is read from server/.env for local runs
// (see playwright.config.ts) or from the environment, and is never printed.

const PASSWORD = process.env.DEMO_USER_PASSWORD;

test.beforeAll(() => {
  if (!PASSWORD) throw new Error("DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)");
});

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" }), "the Login screen is shown").toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("TEST-F01-17 / AC-F01-17: a signed-in user stays signed in after a reload", async ({ page }) => {
  await signIn(page, "ploy.requester@example.com");
  await expect(page).toHaveURL(/\/requests$/);

  await page.reload();

  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.getByRole("banner").getByText("Ploy Srisawat")).toBeVisible();
});

test("TEST-F01-18 / AC-F01-18: after logging out, Login is shown, also for a direct visit to /requests", async ({ page }) => {
  await signIn(page, "mint.reviewer@example.com");
  await expect(page).toHaveURL(/\/reviews$/);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My Requests" })).toHaveCount(0);
  await expect(page.getByText("Mint Chaiyaporn")).toHaveCount(0);
});
