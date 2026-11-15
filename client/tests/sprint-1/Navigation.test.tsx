import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, PLOY, UNAUTHENTICATED, currentPath, mockApi, renderApp } from "./helpers.js";

// F-02 role-based navigation (contract §2.1, AC-F02-11 and 12). Hiding a link is a convenience; the API enforces
// the same rules (server tests).

afterEach(() => vi.unstubAllGlobals());

describe("navigation by role", () => {
  it("TEST-F02-11 / AC-F02-11: a requester sees two links, a reviewer sees three", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: PLOY } } });
    const requester = renderApp("/requests");
    const nav = within(await screen.findByRole("navigation"));
    expect(nav.getByRole("link", { name: "My Requests" })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "New Request" })).toBeInTheDocument();
    expect(nav.queryByRole("link", { name: "Review Inbox" })).not.toBeInTheDocument();
    requester.unmount();

    vi.unstubAllGlobals();
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: MINT } } });
    renderApp("/reviews");
    const reviewerNav = within(await screen.findByRole("navigation"));
    for (const name of ["Review Inbox", "My Requests", "New Request"]) {
      expect(reviewerNav.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("TEST-F02-12 / AC-F02-12: a requester opening /reviews sees a message and no API call is made", async () => {
    const api = mockApi({ "GET /api/auth/me": { status: 200, body: { user: PLOY } } });
    renderApp("/reviews");

    expect(await screen.findByText("This page is not available to you.")).toBeInTheDocument();
    expect(api.calls.some((c) => c.path === "/api/reviews/inbox")).toBe(false);
  });

  it("TEST-F02-12 / AC-F02-12: a signed-out visitor opening /requests is sent to Login", async () => {
    mockApi({ "GET /api/auth/me": { status: 401, body: UNAUTHENTICATED } });
    renderApp("/requests");

    await waitFor(() => expect(currentPath()).toBe("/login"));
  });
});
