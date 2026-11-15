import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, PLOY, decidedDetail, mockApi, renderApp, requestDetail, type Handler, type Reply } from "./helpers.js";

// F-04 decision panel on Request Detail (contract §2.1, AC-F04-16 to 19).

afterEach(() => vi.unstubAllGlobals());

const REASON_LABEL = "Reason (required to reject)";
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
    const { api, typing } = open(MINT, submitted(), { status: 200, body: { request: decidedDetail("REJECTED", reason) } });
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.type(screen.getByLabelText(REASON_LABEL), reason);
    await typing.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Request rejected.")).toBeInTheDocument();
    expect(posts(api)[0].body).toEqual({ decision: "REJECT", reason });
    expect(within(screen.getByRole("group", { name: "Decision" })).getByText(reason)).toBeInTheDocument();
  });

  it("TEST-F04-19 / AC-F04-19: a 409 says so, loads the request again, and the panel is gone", async () => {
    const { api, typing } = open(
      MINT,
      [submitted(), { status: 200, body: { request: decidedDetail("REJECTED", "Over budget.") } }],
      { status: 409, body: { error: { code: "INVALID_TRANSITION", message: "This request has already been decided." } } },
    );
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    await typing.type(screen.getByLabelText(REASON_LABEL), "No.");
    await typing.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("This request has already been decided.")).toBeInTheDocument();
    await waitFor(() => expect(api.calls.filter((c) => c.method === "GET" && c.path === "/api/requests/12")).toHaveLength(2));
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rejected");
  });
});
