import { expect, test, type Page } from "@playwright/test";

// F-06 end-to-end (contract §3, AC-F06-24): Mint returns Ploy's request, Ploy edits and resubmits it, and Mint
// approves it. The new controls are used with the keyboard. The request is made through the API in the test setup.
// Needs the API running on a seeded database, as in auth.spec.ts.

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

test("TEST-F06-24 / AC-F06-24: a request is returned, edited, resubmitted, and approved", async ({ page, request }) => {
  expect(PASSWORD, "DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)").toBeTruthy();
  const title = `E2E return ${Date.now()}`;

  const login = await request.post("/api/auth/login", { data: { email: "ploy.requester@example.com", password: PASSWORD } });
  expect(login.status(), "Ploy signs in through the API").toBe(200);
  const reviewers = (await (await request.get("/api/reviewers")).json()).reviewers as Array<{ id: number; name: string }>;
  const mint = reviewers.find((r) => r.name === "Mint Chaiyaporn")!;
  const created = await request.post("/api/requests", {
    data: { title, description: "Created by the end-to-end test.", amount: "999.00", assignedReviewerId: mint.id },
  });
  expect(created.status(), "Ploy submits a request").toBe(201);
  const path = `/requests/${(await created.json()).request.id}`;

  // Mint returns it: Tab from the Reject button reaches the comment and then the button.
  await signIn(page, "mint.reviewer@example.com");
  await page.goto(path);
  await page.getByRole("button", { name: "Reject" }).focus();
  await page.keyboard.press("Tab");
  const comment = page.getByLabel("Comment for the requester (required to return)");
  await expect(comment).toBeFocused();
  await page.keyboard.type("Please correct the amount.");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Return for changes" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Request returned.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Returned");
  await signOut(page);

  // Ploy changes the amount and resubmits, with the keyboard from the title field on.
  await signIn(page, "ploy.requester@example.com");
  await page.goto(path);
  const form = page.getByRole("region", { name: "Edit and resubmit" });
  await form.getByLabel("Title").focus();
  await page.keyboard.press("Tab");
  await expect(form.getByLabel("Description")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(form.getByLabel("Amount (THB)")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("1099.00");
  await page.keyboard.press("Tab");
  await expect(form.getByRole("button", { name: "Resubmit" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Request resubmitted.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Submitted");
  await signOut(page);

  // Mint approves the resubmitted request; the history keeps every step after a reload.
  await signIn(page, "mint.reviewer@example.com");
  await page.goto(path);
  await expect(page.getByText("1,099.00 THB")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Request approved.")).toBeVisible();
  await page.reload();
  const history = page.locator("ol.history li");
  await expect(history).toHaveCount(4);
  await expect(history.nth(0)).toContainText("Submitted by Ploy Srisawat");
  await expect(history.nth(1)).toContainText("Returned by Mint Chaiyaporn");
  await expect(history.nth(2)).toContainText("Resubmitted by Ploy Srisawat");
  await expect(history.nth(3)).toContainText("Approved by Mint Chaiyaporn");
});
