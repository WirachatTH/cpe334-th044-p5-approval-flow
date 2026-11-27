import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, PLOY, decidedDetail, mockApi, renderApp, requestDetail, requestSummary } from "../sprint-1/helpers.js";
import {
  COMMENT, decisionPanel, ok, openDetail, resubmitForm, resubmittedDetail, returnPanel, returnedDetail,
} from "./helpers.js";

// F-06: which panels Request Detail shows, and how a returned request reads (contract §2.1, AC-F06-20 and 23).

afterEach(() => vi.unstubAllGlobals());

describe("Request Detail and the return loop", () => {
  it.each([
    ["the assigned reviewer of a submitted request", MINT, requestDetail(), { returns: true, resubmits: false }],
    ["the requester of a submitted request", PLOY, requestDetail(), { returns: false, resubmits: false }],
    ["the requester of a returned request", PLOY, returnedDetail(), { returns: false, resubmits: true }],
    ["the assigned reviewer of a returned request", MINT, returnedDetail(), { returns: false, resubmits: false }],
    ["the assigned reviewer of an approved request", MINT, decidedDetail("APPROVED"), { returns: false, resubmits: false }],
    ["the requester of a rejected request", PLOY, decidedDetail("REJECTED", "Over budget."), { returns: false, resubmits: false }],
  ])("TEST-F06-20 / AC-F06-20: %s", async (_label, me, request, shown) => {
    await openDetail(me, ok(request));
    expect(Boolean(returnPanel()), "return panel").toBe(shown.returns);
    expect(Boolean(resubmitForm()), "resubmit form").toBe(shown.resubmits);
    if (request.status === "RETURNED") expect(decisionPanel()).not.toBeInTheDocument();
  });

  it("TEST-F06-23 / AC-F06-23: a returned request shows who returned it, the comment, and the history", async () => {
    await openDetail(PLOY, ok(returnedDetail()));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Returned");
    const decision = within(screen.getByRole("group", { name: "Decision" }));
    expect(decision.getByText("Returned by Mint Chaiyaporn · 14 Nov 2026 17:00")).toBeInTheDocument();
    expect(decision.getByText(COMMENT)).toBeInTheDocument();
    expect(screen.getAllByText("Returned by Mint Chaiyaporn · 14 Nov 2026 17:00")).toHaveLength(2);
  });

  it("TEST-F06-23 / AC-F06-23: a resubmission is named in the history", async () => {
    await openDetail(PLOY, ok(resubmittedDetail()));
    expect(screen.getByText("Resubmitted by Ploy Srisawat · 14 Nov 2026 17:00")).toBeInTheDocument();
  });

  it("TEST-F06-23 / AC-F06-23: My Requests shows the status Returned", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: PLOY } },
      "GET /api/requests/mine": { status: 200, body: { requests: [requestSummary({ status: "RETURNED" })] } },
    });
    renderApp("/requests");
    const row = await screen.findByRole("row", { name: /REQ-000012/ });
    expect(within(row).getByText("Returned")).toBeInTheDocument();
  });
});
