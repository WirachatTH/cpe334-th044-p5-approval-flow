import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLOY, REVIEWERS, currentPath, mockApi, renderApp, requestDetail, type Handler, type Reply } from "./helpers.js";

// F-03 New Request screen (contract §2.1, AC-F03-15 to 17).

afterEach(() => vi.unstubAllGlobals());

const CREATED_REPLY: Reply = { status: 201, body: { request: requestDetail({ id: 7, requestNumber: "REQ-000007" }) } };

async function openForm(post: Handler | Handler[] = CREATED_REPLY, reviewers: unknown[] = REVIEWERS) {
  const api = mockApi({
    "GET /api/auth/me": { status: 200, body: { user: PLOY } },
    "GET /api/reviewers": { status: 200, body: { reviewers } },
    "POST /api/requests": post,
    "GET /api/requests/7": { status: 200, body: { request: requestDetail({ id: 7, requestNumber: "REQ-000007" }) } },
  });
  renderApp("/requests/new");
  return { api, typing: userEvent.setup() };
}

async function fill(typing: ReturnType<typeof userEvent.setup>, amount = "18500.00") {
  await screen.findByRole("option", { name: "Mint Chaiyaporn" });
  await typing.type(screen.getByLabelText("Title"), "Oscilloscope for the electronics lab");
  await typing.type(screen.getByLabelText("Description"), "Replace the broken unit in room 401.");
  await typing.type(screen.getByLabelText("Amount (THB)"), amount);
  await typing.selectOptions(screen.getByLabelText("Reviewer"), "Mint Chaiyaporn");
}

const posts = (api: Awaited<ReturnType<typeof openForm>>["api"]) => api.calls.filter((c) => c.method === "POST");

describe("New Request screen", () => {
  it("TEST-F03-15 / AC-F03-15: a valid form is posted with the amount as a string, then the new request opens", async () => {
    const { api, typing } = await openForm();
    await fill(typing);
    await typing.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(currentPath()).toBe("/requests/7"));
    expect(posts(api)).toHaveLength(1);
    expect(posts(api)[0].body).toEqual({
      title: "Oscilloscope for the electronics lab",
      description: "Replace the broken unit in room 401.",
      amount: "18500.00",
      assignedReviewerId: 3,
    });
    expect(await screen.findByText("Request REQ-000007 submitted.")).toBeInTheDocument();
  });

  it("TEST-F03-16 / AC-F03-16 (a): a blank form shows four messages beneath their fields and sends nothing", async () => {
    const { api, typing } = await openForm();
    await screen.findByRole("option", { name: "Mint Chaiyaporn" });
    await typing.click(screen.getByRole("button", { name: "Submit request" }));

    const expected: Array<[string, string]> = [
      ["Title", "Enter a title."],
      ["Description", "Enter a description."],
      ["Amount (THB)", "Enter an amount."],
      ["Reviewer", "Choose a reviewer."],
    ];
    for (const [label, message] of expected) {
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
    }
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(posts(api)).toHaveLength(0);
  });

  it("TEST-F03-16 / AC-F03-16 (b): an amount with three decimals is refused before anything is sent", async () => {
    const { api, typing } = await openForm();
    await fill(typing, "12.345");
    await typing.click(screen.getByRole("button", { name: "Submit request" }));

    const message = "Enter the amount as a number, for example 1250.50.";
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Amount (THB)")).toHaveAccessibleDescription(message);
    expect(posts(api)).toHaveLength(0);
  });

  it("TEST-F03-16 / AC-F03-16 (c): a message from the API appears beneath its field and the values are kept", async () => {
    const { typing } = await openForm({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields need attention.",
          fields: { assignedReviewerId: "Choose an active reviewer." },
        },
      },
    });
    await fill(typing);
    await typing.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Choose an active reviewer.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reviewer")).toHaveAccessibleDescription("Choose an active reviewer.");
    expect(screen.getByLabelText("Title")).toHaveValue("Oscilloscope for the electronics lab");
    expect(screen.getByLabelText("Amount (THB)")).toHaveValue("18500.00");
  });

  it("TEST-F03-16 / AC-F03-16 (d): while the request is pending the button is disabled and a second click sends nothing", async () => {
    let release!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (release = resolve));
    const { api, typing } = await openForm(() => pending);
    await fill(typing);
    await typing.click(screen.getByRole("button", { name: "Submit request" }));

    const busy = await screen.findByRole("button", { name: "Submitting…" });
    expect(busy).toBeDisabled();
    await typing.click(busy);
    expect(posts(api)).toHaveLength(1);

    release(CREATED_REPLY);
    await waitFor(() => expect(currentPath()).toBe("/requests/7"));
  });

  it("TEST-F03-17 / AC-F03-17: with no reviewers the form says so and cannot be submitted", async () => {
    await openForm(CREATED_REPLY, []);

    expect(await screen.findByText("No reviewers are available right now.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
  });
});
