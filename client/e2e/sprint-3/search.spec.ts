import { expect, test, type Page } from "@playwright/test";

// F-08 end-to-end (contract §3, AC-F08-13): Ploy searches her request by its number with the keyboard only. The
// request is made through the API in the test setup. Needs the API running on a seeded database, as in auth.spec.ts.

const PASSWORD = process.env.DEMO_USER_PASSWORD;

// What the focused element is called: its label, its text, or its id.
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const e = document.activeElement as (HTMLElement & { labels?: NodeListOf<HTMLLabelElement> }) | null;
    if (!e || e === document.body) return "(nothing)";
    const label = e.labels && e.labels[0] ? e.labels[0].innerText : "";
    return `${e.tagName.toLowerCase()} ${(label || e.innerText || e.id || "").trim().replace(/\s+/g, " ")}`;
  });
}

async function tabTo(page: Page, pattern: RegExp, max = 40): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    if (pattern.test(await focused(page))) return;
  }
  throw new Error(`${pattern} was not reached with Tab in ${max} presses; the last focus was "${await focused(page)}"`);
}

test("TEST-F08-13 / AC-F08-13: a request is found by its number with the keyboard only", async ({ page, request }) => {
  expect(PASSWORD, "DEMO_USER_PASSWORD must be set (it is read from server/.env for local runs)").toBeTruthy();
  const login = await request.post("/api/auth/login", { data: { email: "ploy.requester@example.com", password: PASSWORD } });
  expect(login.status(), "Ploy signs in through the API").toBe(200);
  const reviewers = (await (await request.get("/api/reviewers")).json()).reviewers as Array<{ id: number; name: string }>;
  const mint = reviewers.find((r) => r.name === "Mint Chaiyaporn")!;
  const submit = async (title: string) => {
    const res = await request.post("/api/requests", {
      data: { title, description: "Created by the end-to-end test.", amount: "120.00", assignedReviewerId: mint.id },
    });
    expect(res.status(), "Ploy submits a request").toBe(201);
    return (await res.json()).request.requestNumber as string;
  };
  const stamp = Date.now();
  const number = await submit(`E2E search target ${stamp}`);
  await submit(`E2E search other ${stamp}`);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await tabTo(page, /input Email/i);
  await page.keyboard.type("ploy.requester@example.com");
  await tabTo(page, /input Password/i);
  await page.keyboard.type(PASSWORD!);
  await tabTo(page, /button Sign in/i);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "My Requests" })).toBeVisible();

  await tabTo(page, /input Search number or title/i);
  await page.keyboard.type(number);
  await page.keyboard.press("Enter");

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(number);

  await page.reload();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(`E2E search target ${stamp}`);
  await expect(page.getByLabel("Search number or title")).toHaveValue(number);
});
