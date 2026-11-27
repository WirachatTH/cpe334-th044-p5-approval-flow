import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DECIDED_AT, MINT, PLOY, REVIEWERS, inboxItem, mockApi, renderApp, requestDetail, requestSummary,
} from "../sprint-1/helpers.js";
import { decisionPanel, failure, ok, openDetail, returnPanel } from "./helpers.js";

// F-07: the screens of a request above the threshold (contract §2.1, AC-F07-17 and 18).

afterEach(() => vi.unstubAllGlobals());

const ANAN = { id: 5, name: "Anan Wongsawat", email: "anan.reviewer@example.com", role: "REVIEWER" } as const;
const FIRST = { by: REVIEWERS[0], at: DECIDED_AT };
const FIRST_LINE = "First approval by Mint Chaiyaporn · 14 Nov 2026 17:00";
const DECISION = "POST /api/requests/12/decision";

function waitingDetail(overrides: Record<string, unknown> = {}) {
  return requestDetail({
    status: "AWAITING_SECOND_APPROVAL",
    amount: "250000.00",
    decidedBy: REVIEWERS[0],
    decidedAt: DECIDED_AT,
    firstApproval: FIRST,
    history: [
      ...requestDetail().history,
      {
        id: 32, type: "FIRST_APPROVED", fromStatus: "SUBMITTED", toStatus: "AWAITING_SECOND_APPROVAL",
        actor: REVIEWERS[0], reason: null, category: null, createdAt: DECIDED_AT,
      },
    ],
    ...overrides,
  });
}

const approvedDetail = () =>
  waitingDetail({ status: "APPROVED", decidedBy: { id: ANAN.id, name: ANAN.name } });

describe("Request Detail while a request waits for the second approval", () => {
  it("TEST-F07-17 / AC-F07-17: a second reviewer has the decision panel and no return panel", async () => {
    const { typing, posts } = await openDetail(ANAN as unknown as typeof MINT, ok(waitingDetail()), {
      [DECISION]: ok(approvedDetail()),
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Awaiting second approval");
    expect(within(screen.getByRole("group", { name: "Decision" })).getByText(FIRST_LINE)).toBeInTheDocument();
    expect(returnPanel()).not.toBeInTheDocument();
    expect(decisionPanel()).toBeInTheDocument();
    await typing.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Request approved.")).toBeInTheDocument();
    expect(posts()[0].body).toEqual({ decision: "APPROVE" });
  });

  it("TEST-F07-17 / AC-F07-17: the first approver sees a waiting line and no panel", async () => {
    await openDetail(MINT, ok(waitingDetail()));
    expect(screen.getByText("Waiting for a second reviewer.")).toBeInTheDocument();
    expect(decisionPanel()).not.toBeInTheDocument();
    expect(returnPanel()).not.toBeInTheDocument();
  });

  it("TEST-F07-17 / AC-F07-17: the requester sees the first approval and no panel", async () => {
    await openDetail(PLOY, ok(waitingDetail()));
    expect(within(screen.getByRole("group", { name: "Decision" })).getByText(FIRST_LINE)).toBeInTheDocument();
    expect(decisionPanel()).not.toBeInTheDocument();
  });

  it("TEST-F07-17 / AC-F07-17: a first approval says that a second one is needed", async () => {
    const { typing } = await openDetail(MINT, ok(requestDetail({ amount: "250000.00" })), {
      [DECISION]: ok(waitingDetail()),
    });
    await typing.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Request approved. A second approval is needed.")).toBeInTheDocument();
    expect(screen.getByText("Waiting for a second reviewer.")).toBeInTheDocument();
    expect(decisionPanel()).not.toBeInTheDocument();
  });

  it("TEST-F07-17 / AC-F07-17: an old page of the first approver shows the message and loads the request again", async () => {
    const message = "A different reviewer must give the second approval.";
    const { typing, loads } = await openDetail(
      MINT,
      [ok(requestDetail({ amount: "250000.00" })), ok(waitingDetail())],
      { [DECISION]: failure(403, "SAME_APPROVER_FORBIDDEN", message) },
    );
    await typing.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    await waitFor(() => expect(loads()).toHaveLength(2));
    expect(await screen.findByText("Waiting for a second reviewer.")).toBeInTheDocument();
    expect(screen.queryByText("This request is not available to you.")).not.toBeInTheDocument();
  });

  it.each([
    ["approval", async () => undefined, "Approve", { decision: "APPROVE", revision: 1 }],
    [
      "rejection",
      async (typing: Awaited<ReturnType<typeof openDetail>>["typing"]) => {
        await typing.type(screen.getByLabelText("Reason (required to reject)"), "Already ordered last week.");
        await typing.selectOptions(screen.getByLabelText("Rejection category (required to reject)"), "Duplicate request");
      },
      "Reject",
      { decision: "REJECT", reason: "Already ordered last week.", category: "DUPLICATE", revision: 1 },
    ],
  ])("TEST-F07-17 / AC-F07-17: the second reviewer's %s of a resubmitted request sends its revision", async (_label, fill, button, body) => {
    const { typing, posts } = await openDetail(ANAN as unknown as typeof MINT, ok(waitingDetail({ revision: 1 })), {
      [DECISION]: ok(approvedDetail()),
    });
    await fill(typing);
    await typing.click(screen.getByRole("button", { name: button }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0].body).toEqual(body);
  });

  it("TEST-F07-18 / AC-F07-18: the history names the first approval", async () => {
    await openDetail(PLOY, ok(waitingDetail()));
    expect(screen.getAllByText(FIRST_LINE)).toHaveLength(2);
  });

  it("TEST-F07-18 / AC-F07-18: My Requests shows the waiting status", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: PLOY } },
      "GET /api/requests/mine": {
        status: 200,
        body: { requests: [requestSummary({ status: "AWAITING_SECOND_APPROVAL" })] },
      },
    });
    renderApp("/requests");
    const row = await screen.findByRole("row", { name: /REQ-000012/ });
    expect(within(row).getByText("Awaiting second approval")).toBeInTheDocument();
  });

  it("TEST-F07-18 / AC-F07-18: the inbox marks a request that needs the second approval", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: ANAN } },
      "GET /api/reviews/inbox": {
        status: 200,
        body: {
          requests: [
            inboxItem({ status: "AWAITING_SECOND_APPROVAL" }),
            inboxItem({ id: 6, requestNumber: "REQ-000006" }),
          ],
        },
      },
    });
    renderApp("/reviews");
    const marked = await screen.findByRole("row", { name: /REQ-000005/ });
    expect(within(marked).getByText("Second approval")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /REQ-000006/ })).queryByText("Second approval")).not.toBeInTheDocument();
  });
});
