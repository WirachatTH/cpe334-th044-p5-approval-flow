import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLOY, UNAUTHENTICATED, mockApi, renderApp } from "./helpers.js";

// F-05 build footer (contract v0.10, section 2.1, AC-F05-29 and AC-F05-30). The footer says which commit the UI was built
// from, so a person looking at the public page can tell which release is running (Lab 5 R-08).

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const SHA = "67d5cfd3eb5fbf8462c6836a954d83e1589aba11";

describe("build footer", () => {
  it("TEST-F05-29 / AC-F05-29: a 40-character commit shows as its first 7 characters, on the Login screen and when signed in", async () => {
    vi.stubEnv("VITE_GIT_SHA", SHA);
    mockApi({ "GET /api/auth/me": { status: 401, body: UNAUTHENTICATED } });
    const login = renderApp("/login");
    await screen.findByLabelText("Email");
    expect(await screen.findByRole("contentinfo")).toHaveTextContent(/^Build 67d5cfd$/);
    login.unmount();

    vi.unstubAllGlobals();
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: PLOY } } });
    renderApp("/requests");
    // The header exists only for a signed-in user, so the footer is checked after the session is known.
    await screen.findByRole("navigation");
    expect(await screen.findByRole("contentinfo")).toHaveTextContent(/^Build 67d5cfd$/);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["not hexadecimal", "not-a-sha"],
    ["markup", "<b>67d5cfd</b>"],
    ["only 6 characters", "abc123"],
    ["41 characters", SHA + "a"],
    ["uppercase hexadecimal", "ABCDEF1"],
  ])("TEST-F05-30 / AC-F05-30: a value that is %s shows Build dev", async (_label, value) => {
    if (value !== undefined) vi.stubEnv("VITE_GIT_SHA", value);
    mockApi({ "GET /api/auth/me": { status: 401, body: UNAUTHENTICATED } });
    renderApp("/login");
    await screen.findByLabelText("Email");
    expect(await screen.findByRole("contentinfo")).toHaveTextContent(/^Build dev$/);
    expect(document.querySelector("b")).toBeNull();
  });
});
