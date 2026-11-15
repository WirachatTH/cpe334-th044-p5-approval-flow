import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useApi } from "../../src/context/AuthContext.js";
import { PLOY, UNAUTHENTICATED, currentPath, mockApi, renderApp } from "./helpers.js";

// TEST-F01-19 / AC-F01-19: a 401 from any protected call ends the session in one place.

afterEach(() => vi.unstubAllGlobals());

function ProtectedCall() {
  const api = useApi();
  return <button onClick={() => void api("/api/requests/mine")}>call a protected endpoint</button>;
}

describe("session ended", () => {
  it("TEST-F01-19 / AC-F01-19: a 401 sends the user to Login with an explanation", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: PLOY } },
      "GET /api/requests/mine": { status: 401, body: UNAUTHENTICATED },
    });
    renderApp("/requests", <ProtectedCall />);
    await screen.findByText(PLOY.name);

    await userEvent.setup().click(screen.getByRole("button", { name: "call a protected endpoint" }));

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(await screen.findByText("Your session has ended. Please log in again.")).toBeInTheDocument();
  });
});
