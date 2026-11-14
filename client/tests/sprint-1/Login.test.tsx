import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, PASSWORD, PLOY, UNAUTHENTICATED, currentPath, mockApi, renderApp, type Handler, type Reply } from "./helpers.js";

// F-01 Login screen (contract §2.1, AC-F01-14 to 16).

afterEach(() => vi.unstubAllGlobals());

const WRONG: Reply = {
  status: 401,
  body: { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } },
};

async function openLogin(login: Handler | Handler[]) {
  const api = mockApi({ "GET /api/auth/me": { status: 401, body: UNAUTHENTICATED }, "POST /api/auth/login": login });
  renderApp("/login");
  const email = await screen.findByLabelText("Email");
  return { api, email, password: screen.getByLabelText("Password"), button: screen.getByRole("button", { name: "Sign in" }) };
}

describe("Login screen", () => {
  it.each([
    ["requester", PLOY, "/requests", "Requester"],
    ["reviewer", MINT, "/reviews", "Reviewer"],
  ])("TEST-F01-14 / AC-F01-14: a %s lands on their home screen, and the header shows who they are", async (_l, user, home, badge) => {
    const { email, password, button } = await openLogin({ status: 200, body: { user } });
    const typing = userEvent.setup();
    await typing.type(email, user.email);
    await typing.type(password, PASSWORD);
    await typing.click(button);

    await waitFor(() => expect(currentPath()).toBe(home));
    const header = within(screen.getByRole("banner"));
    expect(header.getByText(user.name)).toBeInTheDocument();
    expect(header.getByText(badge)).toBeInTheDocument();
  });

  it("TEST-F01-15 / AC-F01-15 (a): blank fields show both messages beneath their fields and send nothing", async () => {
    const { api, email, password, button } = await openLogin(WRONG);
    await userEvent.setup().click(button);

    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(email).toHaveAccessibleDescription("Enter your email address.");
    expect(password).toHaveAccessibleDescription("Enter your password.");
    expect(email).toHaveFocus();
    expect(api.calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("TEST-F01-15 / AC-F01-15 (b): a wrong password keeps the email and clears the password", async () => {
    const { email, password, button } = await openLogin(WRONG);
    const typing = userEvent.setup();
    await typing.type(email, PLOY.email);
    await typing.type(password, "Wrong-Password-9");
    await typing.click(button);

    expect(await screen.findByText("Email or password is incorrect.")).toBeInTheDocument();
    expect(email).toHaveValue(PLOY.email);
    expect(password).toHaveValue("");
  });

  it("TEST-F01-15 / AC-F01-15 (c): while the request is pending the button is disabled and a second click sends nothing", async () => {
    let release!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (release = resolve));
    const { api, email, password, button } = await openLogin(() => pending);

    const typing = userEvent.setup();
    await typing.type(email, PLOY.email);
    await typing.type(password, PASSWORD);
    await typing.click(button);

    const busy = await screen.findByRole("button", { name: "Signing in…" });
    expect(busy).toBeDisabled();
    await typing.click(busy);
    expect(api.calls.filter((c) => c.method === "POST")).toHaveLength(1);

    release(WRONG);
    await screen.findByText("Email or password is incorrect.");
  });

  it("TEST-F01-16 / AC-F01-16: a throttled sign-in and an inactive account have their own messages", async () => {
    const { email, password, button } = await openLogin([
      { status: 429, body: { error: { code: "TOO_MANY_ATTEMPTS", message: "Too many." } }, headers: { "Retry-After": "600" } },
      { status: 403, body: { error: { code: "ACCOUNT_INACTIVE", message: "Inactive." } } },
    ]);
    const typing = userEvent.setup();
    await typing.type(email, PLOY.email);
    await typing.type(password, PASSWORD);
    await typing.click(button);
    expect(await screen.findByText("Too many sign-in attempts. Try again in 10 minutes.")).toBeInTheDocument();

    await typing.type(password, PASSWORD);
    await typing.click(button);
    expect(await screen.findByText("This account is inactive.")).toBeInTheDocument();
  });
});
