import { expect, test } from "@playwright/test";

// F-04 end-to-end: a reviewer finds a request in the inbox, approves it, and it leaves the inbox (contract §3,
// AC-F04-20). The request is made through the API in the test setup, as Ploy. Needs the API running on a seeded
// database, as in auth.spec.ts.

const PASSWORD = process.env.DEMO_USER_PASSWORD;

test("TEST-F04-20 / AC-F04-20: Mint approves a request from the inbox, and it is gone from the inbox after a reload", async ({ page, request }) => {
  expect(PASSWORD, "DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)").toBeTruthy();
  const title = `E2E decision ${Date.now()}`;

  // Setup, through the API: Ploy submits a request to Mint.
  const signIn = await request.post("/api/auth/login", { data: { email: "ploy.requester@example.com", password: PASSWORD } });
  expect(signIn.status(), "Ploy signs in through the API").toBe(200);
  const reviewers = (await (await request.get("/api/reviewers")).json()).reviewers as Array<{ id: number; name: string }>;
  const mint = reviewers.find((r) => r.name === "Mint Chaiyaporn");
  expect(mint, "Mint is in the reviewer list").toBeDefined();
  const created = await request.post("/api/requests", {
    data: { title, description: "Created by the end-to-end test.", amount: "999.00", assignedReviewerId: mint!.id },
  });
  expect(created.status(), "Ploy submits a request").toBe(201);

  // The journey, in the browser, as Mint.
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill("mint.reviewer@example.com");
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/reviews$/);

  await page.getByRole("row").filter({ hasText: title }).getByRole("link").click();
  await expect(page).toHaveURL(/\/requests\/\d+$/);
  await expect(page.getByRole("region", { name: "Decision" }), "the decision panel is shown").toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByText("Request approved.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Approved");
  await expect(page.getByRole("region", { name: "Decision" })).toHaveCount(0);

  await page.getByRole("navigation").getByRole("link", { name: "Review Inbox" }).click();
  await expect(page).toHaveURL(/\/reviews$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review Inbox" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
});
