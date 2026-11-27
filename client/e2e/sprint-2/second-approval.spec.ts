import { expect, test, type Page } from "@playwright/test";

// F-07 end-to-end (contract §3, AC-F07-19): Ploy submits 250,000.00 THB, Mint gives the first approval, and Anan the
// second. The request is made through the API in the test setup. Needs the API running on a seeded database, as in
// auth.spec.ts.

const PASSWORD = process.env.DEMO_USER_PASSWORD;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

test("TEST-F07-19 / AC-F07-19: a request above the threshold is approved by two reviewers", async ({ page, request }) => {
  expect(PASSWORD, "DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)").toBeTruthy();
  const title = `E2E second approval ${Date.now()}`;

  const login = await request.post("/api/auth/login", { data: { email: "ploy.requester@example.com", password: PASSWORD } });
  expect(login.status(), "Ploy signs in through the API").toBe(200);
  const reviewers = (await (await request.get("/api/reviewers")).json()).reviewers as Array<{ id: number; name: string }>;
  const mint = reviewers.find((r) => r.name === "Mint Chaiyaporn")!;
  const created = await request.post("/api/requests", {
    data: { title, description: "Created by the end-to-end test.", amount: "250000.00", assignedReviewerId: mint.id },
  });
  expect(created.status(), "Ploy submits a request").toBe(201);
  const path = `/requests/${(await created.json()).request.id}`;

  await signIn(page, "mint.reviewer@example.com");
  await page.goto(path);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Request approved. A second approval is needed.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Awaiting second approval");
  await expect(page.getByText("Waiting for a second reviewer.")).toBeVisible();
  await signOut(page);

  await signIn(page, "anan.reviewer@example.com");
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row.getByText("Second approval")).toBeVisible();
  await row.getByRole("link").click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Request approved.", { exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, "ploy.requester@example.com");
  await page.goto(path);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Approved");
  const history = page.locator("ol.history li");
  await expect(history).toHaveCount(3);
  await expect(history.nth(1)).toContainText("First approval by Mint Chaiyaporn");
  await expect(history.nth(2)).toContainText("Approved by Anan Wongsawat");
});
