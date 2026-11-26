import { expect, test } from "@playwright/test";

// F-04 end-to-end (contract §3): a reviewer finds a request in the inbox, approves it, and it leaves the inbox
// (AC-F04-20); and a reviewer rejects one with a category and a reason, which the requester then sees (AC-F04-29).
// Each request is made through the API in the test setup, as Ploy. Needs the API running on a seeded database, as
// in auth.spec.ts.

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

test("TEST-F04-29 / AC-F04-29: Mint rejects with a category chosen by keyboard, and Ploy sees both after a reload", async ({ page, request }) => {
  expect(PASSWORD, "DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)").toBeTruthy();
  const title = `E2E rejection ${Date.now()}`;

  const signIn = await request.post("/api/auth/login", { data: { email: "ploy.requester@example.com", password: PASSWORD } });
  expect(signIn.status(), "Ploy signs in through the API").toBe(200);
  const reviewers = (await (await request.get("/api/reviewers")).json()).reviewers as Array<{ id: number; name: string }>;
  const mint = reviewers.find((r) => r.name === "Mint Chaiyaporn");
  expect(mint, "Mint is in the reviewer list").toBeDefined();
  const created = await request.post("/api/requests", {
    data: { title, description: "Created by the end-to-end test.", amount: "999.00", assignedReviewerId: mint!.id },
  });
  expect(created.status(), "Ploy submits a request").toBe(201);
  const id = (await created.json()).request.id as number;

  const signInAs = async (email: string) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  };

  await signInAs("mint.reviewer@example.com");
  await expect(page).toHaveURL(/\/reviews$/);
  await page.getByRole("row").filter({ hasText: title }).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/requests/${id}$`));

  // A nine-character reason and no category: both messages, and nothing is decided.
  const reason = page.getByLabel("Reason (required to reject)");
  await reason.fill("123456789");
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("Reason must be at least 10 characters.")).toBeVisible();
  await expect(page.getByText("Choose a rejection category.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Submitted");
  await expect(reason).toBeFocused();

  // The category by keyboard only: Tab from the reason, then two steps down the list.
  const category = page.getByLabel("Rejection category (required to reject)");
  await page.keyboard.press("Tab");
  await expect(category).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(category).toHaveValue("INCOMPLETE");
  await reason.fill("1234567890");
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("Request rejected.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Rejected");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await signInAs("ploy.requester@example.com");
  await page.goto(`/requests/${id}`);

  const seenByRequester = async () => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rejected");
    const decision = page.getByRole("group", { name: "Decision" });
    await expect(decision.getByText("Category: Information missing or unclear")).toBeVisible();
    await expect(decision.getByText("1234567890")).toBeVisible();
    const history = page.locator("ol.history > li");
    await expect(history).toHaveCount(2);
    await expect(history.nth(0)).toContainText("Submitted by Ploy Srisawat");
    await expect(history.nth(1)).toContainText("Rejected by Mint Chaiyaporn");
    await expect(history.nth(1)).toContainText("Category: Information missing or unclear");
  };
  await seenByRequester();
  await page.reload();
  await seenByRequester();
});
