import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLOY, mockApi, renderApp, requestSummary } from "./helpers.js";

// F-03 My Requests screen (contract §2.1, AC-F03-18, and the list part of AC-F03-21).

afterEach(() => vi.unstubAllGlobals());

const SIGNED_IN = { "GET /api/auth/me": { status: 200, body: { user: PLOY } } };
const TWO = [
  requestSummary({ id: 2, requestNumber: "REQ-000002", title: "Projector bulbs", amount: "1250.50" }),
  requestSummary({ id: 1, requestNumber: "REQ-000001", title: "Oscilloscope", amount: "18500.00" }),
];

describe("My Requests screen", () => {
  it("TEST-F03-18 / AC-F03-18: each request is a row with number, title, amount, status, reviewer, and date, newest first", async () => {
    mockApi({ ...SIGNED_IN, "GET /api/requests/mine": { status: 200, body: { requests: TWO } } });
    renderApp("/requests");

    const first = await screen.findByRole("link", { name: "REQ-000002" });
    expect(first).toHaveAttribute("href", "/requests/2");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Projector bulbs")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1,250.50")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Submitted")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Mint Chaiyaporn")).toBeInTheDocument();
    expect(within(rows[0]).getByText("14 Nov 2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText("REQ-000001")).toBeInTheDocument();
  });

  it("TEST-F03-18 / AC-F03-18: no requests shows a message with a link to New Request", async () => {
    mockApi({ ...SIGNED_IN, "GET /api/requests/mine": { status: 200, body: { requests: [] } } });
    renderApp("/requests");

    expect(await screen.findByText("You have not submitted any requests yet.")).toBeInTheDocument();
    const link = within(screen.getByRole("main")).getByRole("link", { name: "New Request" });
    expect(link).toHaveAttribute("href", "/requests/new");
  });

  it("TEST-F03-18 / AC-F03-18: an error shows Try again, which loads the list again", async () => {
    const api = mockApi({
      ...SIGNED_IN,
      "GET /api/requests/mine": [
        { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } } },
        { status: 200, body: { requests: TWO } },
      ],
    });
    renderApp("/requests");

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "REQ-000002" })).toBeInTheDocument();
    expect(api.calls.filter((c) => c.path === "/api/requests/mine")).toHaveLength(2);
  });

  it("TEST-F03-21 / AC-F03-21: markup in a title is shown as text, not turned into elements", async () => {
    const title = "<script>alert(1)</script>";
    mockApi({
      ...SIGNED_IN,
      "GET /api/requests/mine": { status: 200, body: { requests: [requestSummary({ title })] } },
    });
    const { container } = renderApp("/requests");

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(container.querySelector("script, img")).toBeNull();
  });
});
