import { expect, test, type APIRequestContext, type Page, type Playwright } from "@playwright/test";

// Release verification journeys (docs/sprints/sprint-1/README.md, "Release verification journeys", Issue #12):
// the integrated Sprint 1 increment through the real UI, API, and database, with the seeded synthetic accounts.
// Needs the API running on a seeded database, as in auth.spec.ts. DEMO_USER_PASSWORD is read from server/.env for
// local runs (see playwright.config.ts) or from the environment, and is never printed.
// These pass when first written: every behaviour they use is already specified and tested in F-01 to F-05.

const PASSWORD = process.env.DEMO_USER_PASSWORD;
const PLOY = "ploy.requester@example.com";
const MINT = "mint.reviewer@example.com";
const KORN = "korn.reviewer@example.com";

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

async function logOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" }), "logging out returns to Login").toBeVisible();
}

async function openNewRequest(page: Page) {
  await page.getByRole("navigation").getByRole("link", { name: "New Request" }).click();
  await expect(page.getByRole("heading", { name: "New Request" })).toBeVisible();
}

async function fillRequest(page: Page, title: string, amount: string) {
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Created by a release verification journey.");
  await page.getByLabel("Amount (THB)").fill(amount);
  await page.getByLabel("Reviewer").selectOption({ label: "Mint Chaiyaporn" });
}

// An API session of its own, so that several users can act in one test. With no email it has no session.
async function apiSession(playwright: Playwright, baseURL: string | undefined, email?: string): Promise<APIRequestContext> {
  const context = await playwright.request.newContext({ baseURL });
  if (email) {
    const res = await context.post("/api/auth/login", { data: { email, password: PASSWORD } });
    expect(res.status(), `${email} signs in through the API`).toBe(200);
  }
  return context;
}

// Ploy submits a request to Mint through the API and returns its id.
async function submitAsPloy(ploy: APIRequestContext, title: string): Promise<number> {
  const reviewers = (await (await ploy.get("/api/reviewers")).json()).reviewers as Array<{ id: number; name: string }>;
  const mint = reviewers.find((r) => r.name === "Mint Chaiyaporn");
  expect(mint, "Mint is in the reviewer list").toBeDefined();
  const res = await ploy.post("/api/requests", {
    data: { title, description: "Created by a release verification journey.", amount: "1500.00", assignedReviewerId: mint!.id },
  });
  expect(res.status(), "Ploy submits a request").toBe(201);
  return (await res.json()).request.id as number;
}

test("TEST-REL-01: happy path, from submission to the approved request seen by its requester", async ({ page }) => {
  const title = `Journey approve ${Date.now()}`;
  const reason = "Within the department budget.";

  // Ploy submits and logs out.
  await signIn(page, PLOY);
  await expect(page).toHaveURL(/\/requests$/);
  await openNewRequest(page);
  await fillRequest(page, title, "2500.00");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page).toHaveURL(/\/requests\/\d+$/);
  const banner = await page.getByText(/^Request REQ-\d{6} submitted\.$/).textContent();
  const number = banner!.match(/REQ-\d{6}/)![0];
  await logOut(page);

  // Mint finds it in the inbox and approves it.
  await signIn(page, MINT);
  await expect(page).toHaveURL(/\/reviews$/);
  const inboxRow = page.getByRole("row").filter({ hasText: title });
  await expect(inboxRow, "the request is in the reviewer's inbox").toBeVisible();
  await inboxRow.getByRole("link", { name: number }).click();
  await expect(page.getByRole("region", { name: "Decision" })).toBeVisible();
  await page.getByLabel("Reason (required to reject)").fill(reason);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Request approved.")).toBeVisible();
  await logOut(page);

  // Ploy signs in again and sees the saved result, also after a reload.
  await signIn(page, PLOY);
  await expect(page).toHaveURL(/\/requests$/);
  const listed = page.getByRole("row").filter({ hasText: title });
  await expect(listed.getByText("Approved", { exact: true })).toBeVisible();
  await listed.getByRole("link", { name: number }).click();

  for (const phase of ["after opening it", "after a reload"]) {
    await expect(page.getByRole("heading", { level: 1 }), phase).toContainText("Approved");
    const decision = page.getByRole("group", { name: "Decision" });
    await expect(decision.getByText("Approved by Mint Chaiyaporn")).toBeVisible();
    await expect(decision.getByText(reason)).toBeVisible();
    const history = page.locator("ol.history li");
    await expect(history, `${phase}: the history has two entries`).toHaveCount(2);
    await expect(history.nth(0)).toContainText("Submitted by Ploy Srisawat");
    await expect(history.nth(1)).toContainText("Approved by Mint Chaiyaporn");
    if (phase === "after opening it") await page.reload();
  }
});

test("TEST-REL-02: business rules block a bad request and an undecided rejection, and change nothing", async ({ page, playwright, baseURL }) => {
  const invalidTitle = `Journey invalid amount ${Date.now()}`;
  const title = `Journey reject ${Date.now()}`;
  const ploy = await apiSession(playwright, baseURL, PLOY);
  const mint = await apiSession(playwright, baseURL, MINT);
  try {
    // (a) An amount of 0 is refused beside the field, and nothing is stored.
    await signIn(page, PLOY);
    await openNewRequest(page);
    await fillRequest(page, invalidTitle, "0");
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByText("Enter an amount greater than 0.")).toBeVisible();
    await expect(page).toHaveURL(/\/requests\/new$/);
    await page.getByRole("navigation").getByRole("link", { name: "My Requests" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "My Requests" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: invalidTitle }), "no request was stored").toHaveCount(0);
    await logOut(page);

    // (b) A rejection with a blank reason is refused in the screen, and the request stays in the inbox.
    const id = await submitAsPloy(ploy, title);
    await signIn(page, MINT);
    await page.getByRole("row").filter({ hasText: title }).getByRole("link").click();
    await expect(page.getByRole("region", { name: "Decision" })).toBeVisible();
    await page.getByRole("button", { name: "Reject" }).click();
    await expect(page.getByText("Enter a reason to reject this request.")).toBeVisible();
    await page.getByRole("navigation").getByRole("link", { name: "Review Inbox" }).click();
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: title }), "the request is still waiting").toBeVisible();

    // (c) The same rule at the API: the server refuses it too, and the request is unchanged.
    const refused = await mint.post(`/api/requests/${id}/decision`, { data: { decision: "REJECT" } });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).error.fields.reason).toBe("Enter a reason to reject this request.");
    const detail = (await (await mint.get(`/api/requests/${id}`)).json()).request;
    expect(detail.status).toBe("SUBMITTED");
    expect(detail.history).toHaveLength(1);
  } finally {
    await ploy.dispose();
    await mint.dispose();
  }
});

test("TEST-REL-03: a requester cannot reach or use reviewer operations, and an unrelated reviewer sees nothing", async ({ page, playwright, baseURL }) => {
  const title = `Journey access ${Date.now()}`;
  const ploy = await apiSession(playwright, baseURL, PLOY);
  const korn = await apiSession(playwright, baseURL, KORN);
  const nobody = await apiSession(playwright, baseURL);
  try {
    const id = await submitAsPloy(ploy, title);

    // In the browser, a requester opening the reviewer screen gets "not available" and no data.
    await signIn(page, PLOY);
    await expect(page).toHaveURL(/\/requests$/);
    await page.goto("/reviews");
    await expect(page.getByText("This page is not available to you.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review Inbox" })).toHaveCount(0);

    // At the API, the backend refuses each of these on its own.
    const noSession = await nobody.get("/api/reviews/inbox");
    expect(noSession.status(), "no session").toBe(401);

    const inbox = await ploy.get("/api/reviews/inbox");
    expect(inbox.status(), "a requester calling the inbox").toBe(403);
    expect((await inbox.json()).error.code).toBe("FORBIDDEN");
    const decide = await ploy.post(`/api/requests/${id}/decision`, { data: { decision: "APPROVE" } });
    expect(decide.status(), "a requester deciding her own request").toBe(403);
    expect((await decide.json()).error.code).toBe("FORBIDDEN");

    const peek = await korn.get(`/api/requests/${id}`);
    expect(peek.status(), "a reviewer it is not assigned to opening it").toBe(404);
    expect((await peek.json()).error.code).toBe("NOT_FOUND");
    const attempt = await korn.post(`/api/requests/${id}/decision`, { data: { decision: "APPROVE" } });
    expect(attempt.status(), "a reviewer it is not assigned to deciding it").toBe(404);
    expect((await attempt.json()).error.code).toBe("NOT_FOUND");

    // None of that changed the request.
    const detail = (await (await ploy.get(`/api/requests/${id}`)).json()).request;
    expect(detail.status).toBe("SUBMITTED");
    expect(detail.history).toHaveLength(1);
  } finally {
    await ploy.dispose();
    await korn.dispose();
    await nobody.dispose();
  }
});
