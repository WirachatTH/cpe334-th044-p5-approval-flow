import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLOY, mockApi, renderApp, requestSummary } from "../sprint-1/helpers.js";
import { AddressProbe, NO_MATCH, address, field, queries } from "./helpers.js";

// F-08 slice 1: the filter bar of My Requests (contract §2.1, AC-F08-10 and 11).

afterEach(() => vi.unstubAllGlobals());

const MINE = "/api/requests/mine";
const SIGNED_IN = { "GET /api/auth/me": { status: 200, body: { user: PLOY } } };
const list = (...requests: unknown[]) => ({ status: 200, body: { requests } });
const ALL = list(requestSummary(), requestSummary({ id: 13, requestNumber: "REQ-000013", title: "Lab supplies" }));
const ONE = list(requestSummary({ id: 13, requestNumber: "REQ-000013", title: "Lab supplies" }));
const row = (number: string) => screen.queryByRole("link", { name: number });

async function open(path: string, ...answers: ReturnType<typeof list>[]) {
  const api = mockApi({ ...SIGNED_IN, [`GET ${MINE}`]: answers });
  renderApp(path, <AddressProbe />);
  await screen.findByLabelText("Search number or title");
  return { api, typing: userEvent.setup() };
}

describe("My Requests filters", () => {
  it("TEST-F08-10 / AC-F08-10: applying puts the filters in the address and loads the list with them", async () => {
    const { api, typing } = await open("/requests", ALL, ONE, ALL);
    expect(await screen.findByRole("link", { name: "REQ-000012" })).toBeInTheDocument();
    expect(Array.from((field("status") as HTMLSelectElement).options, (o) => o.text)).toEqual([
      "All", "Submitted", "Approved", "Rejected", "Returned", "Awaiting second approval",
    ]);

    await typing.type(field("q"), "  lab ");
    await typing.selectOptions(field("status"), "Submitted");
    await typing.type(field("from"), "2026-11-01");
    await typing.type(field("to"), "2026-11-30");
    await typing.type(field("minAmount"), "100");
    await typing.type(field("maxAmount"), "20000.50");
    await typing.click(screen.getByRole("button", { name: "Apply filters" }));

    const filters = {
      q: "lab", status: "SUBMITTED", from: "2026-11-01", to: "2026-11-30", minAmount: "100", maxAmount: "20000.50",
    };
    await waitFor(() => expect(row("REQ-000012")).not.toBeInTheDocument());
    expect(await screen.findByRole("link", { name: "REQ-000013" })).toBeInTheDocument();
    expect(address()).toEqual(filters);
    expect(queries(api, MINE)).toEqual([{}, filters]);

    await typing.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByRole("link", { name: "REQ-000012" })).toBeInTheDocument();
    expect(address()).toEqual({});
    expect(queries(api, MINE)[2]).toEqual({});
    expect(field("q")).toHaveValue("");
    expect(field("status")).toHaveDisplayValue("All");
  });

  it("TEST-F08-10 / AC-F08-10: an opened address fills the fields and loads that list", async () => {
    const { api } = await open("/requests?q=lab&status=APPROVED&from=2026-11-01&maxAmount=500", ONE);
    expect(await screen.findByRole("link", { name: "REQ-000013" })).toBeInTheDocument();
    expect(field("q")).toHaveValue("lab");
    expect(field("status")).toHaveDisplayValue("Approved");
    expect(field("from")).toHaveValue("2026-11-01");
    expect(field("to")).toHaveValue("");
    expect(field("maxAmount")).toHaveValue("500");
    expect(queries(api, MINE)).toEqual([{ q: "lab", status: "APPROVED", from: "2026-11-01", maxAmount: "500" }]);
  });

  it("TEST-F08-10 / AC-F08-10: Enter applies, and a list without a match says so", async () => {
    const { typing } = await open("/requests", ALL, list());
    await typing.type(field("q"), "nothing{Enter}");
    expect(await screen.findByText(NO_MATCH)).toBeInTheDocument();
    expect(screen.queryByText("You have not submitted any requests yet.")).not.toBeInTheDocument();
    expect(address()).toEqual({ q: "nothing" });
    expect(field("q")).toHaveValue("nothing");
  });

  it("TEST-F08-10 / AC-F08-10: without filters an empty list keeps its own message", async () => {
    await open("/requests", list());
    expect(await screen.findByText("You have not submitted any requests yet.")).toBeInTheDocument();
    expect(screen.queryByText(NO_MATCH)).not.toBeInTheDocument();
  });

  it("TEST-F08-11 / AC-F08-11: invalid values are shown beside their fields and nothing is sent", async () => {
    const { api, typing } = await open("/requests", ALL);
    await typing.type(field("q"), "x".repeat(121));
    await typing.type(field("from"), "2026-02-30");
    await typing.type(field("to"), "soon");
    await typing.type(field("minAmount"), "-1");
    await typing.type(field("maxAmount"), "1,000");
    await typing.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(field("q")).toHaveAccessibleDescription("Search text must be 120 characters or fewer.");
    expect(field("from")).toHaveAccessibleDescription("Enter a date as YYYY-MM-DD.");
    expect(field("to")).toHaveAccessibleDescription("Enter a date as YYYY-MM-DD.");
    expect(field("minAmount")).toHaveAccessibleDescription("Enter the amount as a number, for example 1250.50.");
    expect(field("maxAmount")).toHaveAccessibleDescription("Enter the amount as a number, for example 1250.50.");
    expect(field("q")).toHaveFocus();
    expect(field("q")).toHaveAttribute("aria-invalid", "true");
    expect(queries(api, MINE)).toHaveLength(1);
    expect(address()).toEqual({});
  });

  it("TEST-F08-11 / AC-F08-11: a range the wrong way round is refused and gets the focus", async () => {
    const { api, typing } = await open("/requests", ALL);
    await typing.type(field("from"), "2026-11-10");
    await typing.type(field("to"), "2026-11-09");
    await typing.type(field("minAmount"), "200");
    await typing.type(field("maxAmount"), "100.99");
    await typing.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(field("to")).toHaveAccessibleDescription("The end date is before the start date.");
    expect(field("maxAmount")).toHaveAccessibleDescription("The maximum is below the minimum.");
    expect(field("to")).toHaveFocus();
    expect(field("from")).not.toHaveAttribute("aria-invalid");
    expect(queries(api, MINE)).toHaveLength(1);
  });

  it("TEST-F08-11 / AC-F08-11: the field messages of the API are shown the same way", async () => {
    const refusal = {
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR", message: "Some fields need attention.",
          fields: { status: "Choose a status from the list.", minAmount: "Give this filter once." },
        },
      },
    };
    mockApi({ ...SIGNED_IN, [`GET ${MINE}`]: refusal });
    renderApp("/requests?status=DONE&minAmount=1&minAmount=2", <AddressProbe />);

    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveAccessibleDescription("Choose a status from the list."));
    expect(field("minAmount")).toHaveAccessibleDescription("Give this filter once.");
    expect(field("status")).toHaveFocus();
    expect(screen.queryByText("Something went wrong. Please try again.")).not.toBeInTheDocument();
    expect(screen.queryByText(NO_MATCH)).not.toBeInTheDocument();
  });
});
