import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, PLOY, decidedDetail, mockApi, renderApp, requestDetail, type Handler, type Reply } from "./helpers.js";

// F-04 decision panel on Request Detail (contract §2.1, AC-F04-16 to 19 and AC-F04-28).

afterEach(() => vi.unstubAllGlobals());

const REASON_LABEL = "Reason (required to reject)";
const CATEGORY_LABEL = "Rejection category (required to reject)";
const panel = () => screen.queryByRole("region", { name: "Decision" });

function open(
  me: typeof MINT | typeof PLOY,
  detail: Handler | Handler[],
  decision?: Handler,
) {
  const api = mockApi({
    "GET /api/auth/me": { status: 200, body: { user: me } },
    "GET /api/requests/12": detail,
    ...(decision ? { "POST /api/requests/12/decision": decision } : {}),
  });
  renderApp("/requests/12");
  return { api, typing: userEvent.setup() };
}

const submitted = (): Reply => ({ status: 200, body: { request: requestDetail() } });
const posts = (api: ReturnType<typeof open>["api"]) => api.calls.filter((c) => c.method === "POST");

describe("decision panel", () => {
  it("TEST-F04-16 / AC-F04-16: only the assigned reviewer of a SUBMITTED request sees it", async () => {
    open(MINT, submitted());
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    expect(panel(), "the assigned reviewer of a submitted request").toBeInTheDocument();
    expect(within(panel()!).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(panel()!).getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("TEST-F04-16 / AC-F04-16: the requester does not see it", async () => {
    open(PLOY, submitted());
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    expect(panel()).not.toBeInTheDocument();
  });

  it("TEST-F04-16 / AC-F04-16: nobody sees it once the request is decided", async () => {
    open(MINT, { status: 200, body: { request: decidedDetail("APPROVED") } });
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    expect(panel()).not.toBeInTheDocument();
  });

  it("TEST-F04-17 / AC-F04-17 (a): Reject with a blank reason shows a message beneath the field and sends nothing", async () => {
    const { api, typing } = open(MINT, submitted(), submitted());
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.click(screen.getByRole("button", { name: "Reject" }));

    const message = "Enter a reason to reject this request.";
    expect(await screen.findByText(message)).toBeInTheDocument();
    const field = screen.getByLabelText(REASON_LABEL);
    expect(field).toHaveAccessibleDescription(message);
    expect(field).toHaveFocus();
    expect(posts(api)).toHaveLength(0);
  });

  it("TEST-F04-17 / AC-F04-17 (b): more than 1000 characters shows the length message and sends nothing", async () => {
    const { api, typing } = open(MINT, submitted(), submitted());
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.click(screen.getByLabelText(REASON_LABEL));
    await typing.paste("x".repeat(1001));
    expect(screen.getByText("1001 / 1000")).toBeInTheDocument();
    await typing.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Reason must be 1,000 characters or fewer.")).toBeInTheDocument();
    expect(posts(api)).toHaveLength(0);
  });

  it("TEST-F04-17 / AC-F04-17 (c): while a decision is in flight both buttons are disabled and a second click sends nothing", async () => {
    let release!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (release = resolve));
    const { api, typing } = open(MINT, submitted(), () => pending);
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.click(screen.getByRole("button", { name: "Approve" }));

    const saving = await screen.findByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    await typing.click(saving);
    expect(posts(api)).toHaveLength(1);

    release({ status: 200, body: { request: decidedDetail("APPROVED") } });
    await screen.findByText("Request approved.");
  });

  it("TEST-F04-18 / AC-F04-18: an approval updates the page from the response and removes the panel", async () => {
    const { api, typing } = open(MINT, submitted(), { status: 200, body: { request: decidedDetail("APPROVED") } });
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText("Request approved.")).toBeInTheDocument();
    expect(posts(api)[0].body).toEqual({ decision: "APPROVE" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Approved");
    const line = "Approved by Mint Chaiyaporn · 14 Nov 2026 17:00";
    expect(within(screen.getByRole("group", { name: "Decision" })).getByText(line)).toBeInTheDocument();
    // The same line is also the newest history entry, so the history gained it.
    expect(screen.getAllByText(line)).toHaveLength(2);
    expect(panel()).not.toBeInTheDocument();
  });

  it("TEST-F04-18 / AC-F04-18: a rejection sends its reason", async () => {
    const reason = "Please get a second quotation.";
    const answer = { status: 200, body: { request: decidedDetail("REJECTED", reason, "INCOMPLETE") } };
    const { api, typing } = open(MINT, submitted(), answer);
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.type(screen.getByLabelText(REASON_LABEL), reason);
    await typing.selectOptions(screen.getByLabelText(CATEGORY_LABEL), "Information missing or unclear");
    await typing.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Request rejected.")).toBeInTheDocument();
    expect(posts(api)[0].body).toEqual({ decision: "REJECT", reason, category: "INCOMPLETE" });
    expect(within(screen.getByRole("group", { name: "Decision" })).getByText(reason)).toBeInTheDocument();
  });

  it("TEST-F04-19 / AC-F04-19: a 409 says so, loads the request again, and the panel is gone", async () => {
    const { api, typing } = open(
      MINT,
      [submitted(), { status: 200, body: { request: decidedDetail("REJECTED", "Over budget.") } }],
      { status: 409, body: { error: { code: "INVALID_TRANSITION", message: "This request has already been decided." } } },
    );
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.type(screen.getByLabelText(REASON_LABEL), "Not this time.");
    await typing.selectOptions(screen.getByLabelText(CATEGORY_LABEL), "Budget not available");
    await typing.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("This request has already been decided.")).toBeInTheDocument();
    await waitFor(() => expect(api.calls.filter((c) => c.method === "GET" && c.path === "/api/requests/12")).toHaveLength(2));
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rejected");
  });
});

// Change request #65 (Lab 7): the reason needs 10 characters and a rejection needs a category.
describe("decision panel: rejection reason and category", () => {
  const SHORT = "Reason must be at least 10 characters.";
  const NO_CATEGORY = "Choose a rejection category.";
  const rejected = (): Reply => ({ status: 200, body: { request: decidedDetail("REJECTED", "1234567890", "BUDGET") } });

  // Opens the panel, optionally chooses "Budget not available", types the reason, and presses a button.
  async function attempt(reason: string, withCategory: boolean, button: "Approve" | "Reject", answer: Reply = rejected()) {
    const opened = open(MINT, submitted(), answer);
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    if (withCategory) {
      await opened.typing.selectOptions(screen.getByLabelText(CATEGORY_LABEL), "Budget not available");
    }
    await opened.typing.click(screen.getByLabelText(REASON_LABEL));
    await opened.typing.paste(reason);
    await opened.typing.click(screen.getByRole("button", { name: button }));
    return opened;
  }

  async function expectOnlyReasonProblem(api: ReturnType<typeof open>["api"]) {
    expect(await screen.findByText(SHORT)).toBeInTheDocument();
    expect(screen.queryByText(NO_CATEGORY)).not.toBeInTheDocument();
    expect(screen.getByLabelText(REASON_LABEL)).toHaveAccessibleDescription(SHORT);
    expect(screen.getByLabelText(REASON_LABEL)).toHaveFocus();
    expect(posts(api)).toHaveLength(0);
  }

  it("TEST-F04-28 / AC-F04-28 (a): a short reason and no category show both messages, with focus on the reason", async () => {
    const { api } = await attempt("No", false, "Reject");

    expect(await screen.findByText(SHORT)).toBeInTheDocument();
    expect(screen.getByLabelText(REASON_LABEL)).toHaveAccessibleDescription(SHORT);
    expect(screen.getByLabelText(CATEGORY_LABEL)).toHaveAccessibleDescription(NO_CATEGORY);
    expect(screen.getByLabelText(REASON_LABEL)).toHaveFocus();
    expect(posts(api)).toHaveLength(0);
  });

  it("TEST-F04-28 / AC-F04-28 (b): nine characters inside spaces show only the reason message", async () => {
    const { api } = await attempt("  123456789  ", true, "Reject");
    await expectOnlyReasonProblem(api);
  });

  it("TEST-F04-28 / AC-F04-28 (c): a missing category shows its message beneath the select and focuses it", async () => {
    const { api } = await attempt("1234567890", false, "Reject");

    expect(await screen.findByText(NO_CATEGORY)).toBeInTheDocument();
    expect(screen.queryByText(SHORT)).not.toBeInTheDocument();
    expect(screen.getByLabelText(CATEGORY_LABEL)).toHaveAccessibleDescription(NO_CATEGORY);
    expect(screen.getByLabelText(CATEGORY_LABEL)).toHaveFocus();
    expect(posts(api)).toHaveLength(0);
  });

  it("TEST-F04-28 / AC-F04-28 (d): a valid rejection sends the reason and the category", async () => {
    const { api } = await attempt("1234567890", true, "Reject");

    expect(await screen.findByText("Request rejected.")).toBeInTheDocument();
    expect(posts(api)[0].body).toEqual({ decision: "REJECT", reason: "1234567890", category: "BUDGET" });
  });

  it("TEST-F04-28 / AC-F04-28 (e): an approval sends no category, whatever the select holds", async () => {
    const approved: Reply = { status: 200, body: { request: decidedDetail("APPROVED", "ok") } };
    const { api } = await attempt("ok", true, "Approve", approved);

    expect(await screen.findByText("Request approved.")).toBeInTheDocument();
    expect(posts(api)[0].body).toEqual({ decision: "APPROVE", reason: "ok" });
  });

  it("TEST-F04-28 / AC-F04-28 (f): a category message from the API appears beneath the select and focuses it", async () => {
    const refused: Reply = {
      status: 400,
      body: { error: { code: "VALIDATION_ERROR", message: "Some fields need attention.", fields: { category: NO_CATEGORY } } },
    };
    const { api } = await attempt("1234567890", true, "Reject", refused);

    expect(await screen.findByText(NO_CATEGORY)).toBeInTheDocument();
    expect(screen.getByLabelText(CATEGORY_LABEL)).toHaveAccessibleDescription(NO_CATEGORY);
    await waitFor(() => expect(screen.getByLabelText(CATEGORY_LABEL)).toHaveFocus());
    expect(posts(api)).toHaveLength(1);
  });

  it("TEST-F04-28 / AC-F04-28 (g): five emoji are five characters, so the reason is too short", async () => {
    const { api } = await attempt("\u{1F600}".repeat(5), true, "Reject");
    await expectOnlyReasonProblem(api);
  });
});
