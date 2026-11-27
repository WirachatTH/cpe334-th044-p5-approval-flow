import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLOY, decidedDetail, mockApi, renderApp, requestDetail } from "./helpers.js";

// F-03 Request Detail screen (contract §2.1, AC-F03-19, and the detail part of AC-F03-21).

afterEach(() => vi.unstubAllGlobals());

const SIGNED_IN = { "GET /api/auth/me": { status: 200, body: { user: PLOY } } };

describe("Request Detail screen", () => {
  it("TEST-F03-19 / AC-F03-19: a request shows its fields, status, and history", async () => {
    mockApi({ ...SIGNED_IN, "GET /api/requests/12": { status: 200, body: { request: requestDetail() } } });
    renderApp("/requests/12");

    expect(await screen.findByRole("heading", { level: 1, name: /REQ-000012/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Submitted");
    expect(screen.getByText("Oscilloscope for the electronics lab")).toBeInTheDocument();
    expect(screen.getByText("Replace the broken unit in room 401.")).toBeInTheDocument();
    expect(screen.getByText("18,500.00 THB")).toBeInTheDocument();
    expect(screen.getByText("Mint Chaiyaporn")).toBeInTheDocument();
    expect(screen.getByText("Submitted by Ploy Srisawat · 14 Nov 2026 16:05")).toBeInTheDocument();
  });

  it("TEST-F03-19 / AC-F03-19: a request that is not available shows a message and none of its fields", async () => {
    mockApi({
      ...SIGNED_IN,
      "GET /api/requests/12": { status: 404, body: { error: { code: "NOT_FOUND", message: "Not found." } } },
    });
    renderApp("/requests/12");

    expect(await screen.findByText("This request is not available to you.")).toBeInTheDocument();
    expect(screen.queryByText("Oscilloscope for the electronics lab")).not.toBeInTheDocument();
    expect(screen.queryByText(/REQ-000012/)).not.toBeInTheDocument();
  });

  it("TEST-F03-21 / AC-F03-21: markup in a title and description is shown as text, not turned into elements", async () => {
    const title = "<script>alert(1)</script>";
    const description = "<img src=x onerror=alert(1)>";
    mockApi({
      ...SIGNED_IN,
      "GET /api/requests/12": { status: 200, body: { request: requestDetail({ title, description }) } },
    });
    const { container } = renderApp("/requests/12");

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(container.querySelector("script, img")).toBeNull();
  });
});

// F-04 / AC-F04-34: what Request Detail says about the category of a decision.
describe("Request Detail screen: rejection category", () => {
  async function show(request: ReturnType<typeof decidedDetail>) {
    mockApi({ ...SIGNED_IN, "GET /api/requests/12": { status: 200, body: { request } } });
    const { container } = renderApp("/requests/12");
    await screen.findByRole("heading", { level: 1, name: /REQ-000012/ });
    return {
      decision: within(screen.getByRole("group", { name: "Decision" })),
      history: within(container.querySelector<HTMLElement>("ol.history")!),
    };
  }

  it("TEST-F04-34 / AC-F04-34: a rejection shows its category in the Decision section and the history", async () => {
    const { decision, history } = await show(decidedDetail("REJECTED", "Already ordered last week.", "DUPLICATE"));

    expect(decision.getByText("Category: Duplicate request")).toBeInTheDocument();
    expect(history.getByText("Category: Duplicate request")).toBeInTheDocument();
  });

  it("TEST-F04-34 / AC-F04-34: an earlier rejection shows Not recorded in the Decision section only", async () => {
    const { decision, history } = await show(decidedDetail("REJECTED", "Over budget."));

    expect(decision.getByText("Category: Not recorded")).toBeInTheDocument();
    expect(history.queryByText(/^Category:/)).not.toBeInTheDocument();
  });

  it("TEST-F04-34 / AC-F04-34: an approval shows no category", async () => {
    await show(decidedDetail("APPROVED"));

    expect(screen.queryByText(/^Category:/)).not.toBeInTheDocument();
  });
});
