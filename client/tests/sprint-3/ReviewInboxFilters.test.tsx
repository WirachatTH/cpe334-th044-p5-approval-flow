import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, inboxItem, mockApi, renderApp } from "../sprint-1/helpers.js";
import { AddressProbe, NO_MATCH, address, field, queries } from "./helpers.js";

// F-08 slice 1: the filter bar of the Review Inbox (contract §2.1, AC-F08-12).

afterEach(() => vi.unstubAllGlobals());

const INBOX = "/api/reviews/inbox";
const SIGNED_IN = { "GET /api/auth/me": { status: 200, body: { user: MINT } } };
const list = (...requests: unknown[]) => ({ status: 200, body: { requests } });
const WAITING = inboxItem({ id: 6, requestNumber: "REQ-000006", status: "AWAITING_SECOND_APPROVAL" });
const BOTH = list(inboxItem(), WAITING);

async function open(path: string, ...answers: ReturnType<typeof list>[]) {
  const api = mockApi({ ...SIGNED_IN, [`GET ${INBOX}`]: answers });
  renderApp(path, <AddressProbe />);
  await screen.findByLabelText("Search number or title");
  return { api, typing: userEvent.setup() };
}

describe("Review Inbox filters", () => {
  it("TEST-F08-12 / AC-F08-12: the status field offers the two statuses of the inbox", async () => {
    await open("/reviews", BOTH);
    expect(Array.from((field("status") as HTMLSelectElement).options, (o) => o.text)).toEqual([
      "All", "Submitted", "Awaiting second approval",
    ]);
  });

  it("TEST-F08-12 / AC-F08-12: applying and clearing follow the address", async () => {
    const { api, typing } = await open("/reviews", BOTH, list(WAITING), BOTH);
    expect(await screen.findByRole("link", { name: "REQ-000005" })).toBeInTheDocument();

    await typing.selectOptions(field("status"), "Awaiting second approval");
    await typing.type(field("minAmount"), "100");
    await typing.click(screen.getByRole("button", { name: "Apply filters" }));

    const filters = { status: "AWAITING_SECOND_APPROVAL", minAmount: "100" };
    await waitFor(() => expect(screen.queryByRole("link", { name: "REQ-000005" })).not.toBeInTheDocument());
    expect(await screen.findByRole("link", { name: "REQ-000006" })).toBeInTheDocument();
    expect(address()).toEqual(filters);
    expect(queries(api, INBOX)).toEqual([{}, filters]);

    await typing.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByRole("link", { name: "REQ-000005" })).toBeInTheDocument();
    expect(address()).toEqual({});
    expect(field("minAmount")).toHaveValue("");
  });

  it("TEST-F08-12 / AC-F08-12: an opened address fills the fields, and no match says so", async () => {
    await open("/reviews?q=drill&status=SUBMITTED", list());
    expect(await screen.findByText(NO_MATCH)).toBeInTheDocument();
    expect(screen.queryByText("No requests are waiting for your review.")).not.toBeInTheDocument();
    expect(field("q")).toHaveValue("drill");
    expect(field("status")).toHaveDisplayValue("Submitted");
  });

  it("TEST-F08-12 / AC-F08-12: invalid values are refused on the screen", async () => {
    const { api, typing } = await open("/reviews", BOTH);
    await typing.type(field("to"), "tomorrow{Enter}");
    expect(field("to")).toHaveAccessibleDescription("Enter a date as YYYY-MM-DD.");
    expect(field("to")).toHaveFocus();
    expect(queries(api, INBOX)).toHaveLength(1);
  });
});
