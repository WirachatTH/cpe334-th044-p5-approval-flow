import { expect, test, type Page } from "@playwright/test";

// TEST-REL-04: the main screens can be used with the keyboard alone (Definition of Done RD-7, automated part), defined in
// docs/sprints/sprint-1/README.md. Only keyboard events are used (Tab, Enter, Space, typing): nothing is clicked.
// This does not replace a pass by a person. Needs the API running on a seeded database, as in auth.spec.ts.
// It passes when first written: every behaviour it uses is already built and tested in F-01 to F-04.

const PASSWORD = process.env.DEMO_USER_PASSWORD;

test.beforeAll(() => {
  if (!PASSWORD) throw new Error("DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)");
});

// What the focused element is called: its aria-label, its label, its text, its value, or its id.
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const e = document.activeElement as (HTMLElement & { labels?: NodeListOf<HTMLLabelElement>; value?: string }) | null;
    if (!e || e === document.body) return "(nothing)";
    const label = e.labels && e.labels[0] ? e.labels[0].innerText : "";
    return `${e.tagName.toLowerCase()} ${(e.getAttribute("aria-label") || label || e.innerText || e.value || e.id || "").toString().trim().replace(/\s+/g, " ")}`;
  });
}

// Press Tab until the focused element's name matches. Fails if it is not reached within `max` presses.
async function tabTo(page: Page, pattern: RegExp, max = 80): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    if (pattern.test(await focused(page))) return;
  }
  throw new Error(`${pattern} was not reached with Tab in ${max} presses; the last focus was "${await focused(page)}"`);
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await tabTo(page, /input Email/i);
  await page.keyboard.type(email);
  await tabTo(page, /input Password/i);
  await page.keyboard.type(PASSWORD!);
  await tabTo(page, /button Sign in/i);
  await page.keyboard.press("Enter");
}

async function logOut(page: Page) {
  await tabTo(page, /button Log out/i);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Sign in" }), "logging out with the keyboard returns to Login").toBeVisible();
}

test("TEST-REL-04: every action on the five main screens can be done with the keyboard alone", async ({ page }) => {
  const title = `Keyboard journey ${Date.now()}`;

  // Requester: Login, My Requests, New Request, Request Detail.
  await signIn(page, "ploy.requester@example.com");
  await expect(page.getByRole("heading", { name: "My Requests" })).toBeVisible();
  await tabTo(page, /a New Request/i);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "New Request" })).toBeVisible();

  await tabTo(page, /input Title/i);
  await page.keyboard.type(title);
  await tabTo(page, /textarea Description/i);
  await page.keyboard.type("Filled in with the keyboard only.");
  await tabTo(page, /input Amount/i);
  await page.keyboard.type("0");
  await tabTo(page, /select Reviewer/i);
  await page.keyboard.type("Mint");
  await tabTo(page, /button Submit request/i);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Enter an amount greater than 0.")).toBeVisible();
  expect(await focused(page), "a refused amount moves focus to the Amount field").toMatch(/input Amount/i);

  await page.keyboard.press("Control+A");
  await page.keyboard.type("1250.50");
  await tabTo(page, /button Submit request/i);
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^Request REQ-\d{6} submitted\.$/)).toBeVisible();
  await logOut(page);

  // Reviewer: Login, Review Inbox, Request Detail with the decision panel.
  await signIn(page, "mint.reviewer@example.com");
  await expect(page.getByRole("heading", { name: "Review Inbox" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toBeVisible();
  for (let i = 0; ; i += 1) {
    if (i === 120) throw new Error("the link of the request in the inbox was not reached with Tab in 120 presses");
    await page.keyboard.press("Tab");
    const onRow = await page.evaluate((t) => {
      const e = document.activeElement;
      return !!(e && e.tagName === "A" && e.closest("tr") && (e.closest("tr") as HTMLElement).innerText.includes(t));
    }, title);
    if (onRow) break;
  }
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Decision" })).toBeVisible();

  await tabTo(page, /textarea Reason/i);
  await tabTo(page, /button Approve/i);
  await tabTo(page, /button Reject/i);
  await page.keyboard.press("Space");
  await expect(page.getByText("Enter a reason to reject this request.")).toBeVisible();
  expect(await focused(page), "a blank rejection reason moves focus to the Reason field").toMatch(/textarea Reason/i);

  await page.keyboard.type("Within the budget.");
  await tabTo(page, /button Approve/i);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Request approved.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Approved");
  await logOut(page);
});
