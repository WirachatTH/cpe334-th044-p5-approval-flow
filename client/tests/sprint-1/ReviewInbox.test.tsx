import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, currentPath, inboxItem, mockApi, renderApp, requestDetail } from "./helpers.js";

// F-04 Review Inbox screen (contract §2.1, AC-F04-15).

afterEach(() => vi.unstubAllGlobals());

const SIGNED_IN = { "GET /api/auth/me": { status: 200, body: { user: MINT } } };
const TWO = [
  inboxItem({ id: 5, requestNumber: "REQ-000005", title: "Projector bulbs", amount: "1250.50" }),
  inboxItem({ id: 6, requestNumber: "REQ-000006", title: "Oscilloscope", amount: "18500.00", requester: { id: 2, name: "Nattapong Kaewdee" } }),
];

describe("Review Inbox screen", () => {
  it("TEST-F04-15 / AC-F04-15: each request is a row with number, title, requester, amount, and date, in the order given", async () => {
    mockApi({ ...SIGNED_IN, "GET /api/reviews/inbox": { status: 200, body: { requests: TWO } } });
    renderApp("/reviews");

    expect(await screen.findByRole("link", { name: "REQ-000005" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Projector bulbs")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Ploy Srisawat")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1,250.50")).toBeInTheDocument();
    expect(within(rows[0]).getByText("14 Nov 2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText("REQ-000006")).toBeInTheDocument();
  });

  it("TEST-F04-15 / AC-F04-15: a row opens the request", async () => {
    mockApi({
      ...SIGNED_IN,
      "GET /api/reviews/inbox": { status: 200, body: { requests: TWO } },
      "GET /api/requests/5": { status: 200, body: { request: requestDetail({ id: 5, requestNumber: "REQ-000005" }) } },
    });
    renderApp("/reviews");

    await userEvent.setup().click(await screen.findByRole("link", { name: "REQ-000005" }));

    await waitFor(() => expect(currentPath()).toBe("/requests/5"));
  });

  it("TEST-F04-15 / AC-F04-15: an empty inbox says so", async () => {
    mockApi({ ...SIGNED_IN, "GET /api/reviews/inbox": { status: 200, body: { requests: [] } } });
    renderApp("/reviews");

    expect(await screen.findByText("No requests are waiting for your review.")).toBeInTheDocument();
  });

  it("TEST-F04-15 / AC-F04-15: an error shows Try again, which loads the inbox again", async () => {
    const api = mockApi({
      ...SIGNED_IN,
      "GET /api/reviews/inbox": [
        { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } } },
        { status: 200, body: { requests: TWO } },
      ],
    });
    renderApp("/reviews");

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "REQ-000005" })).toBeInTheDocument();
    expect(api.calls.filter((c) => c.path === "/api/reviews/inbox")).toHaveLength(2);
  });
});
