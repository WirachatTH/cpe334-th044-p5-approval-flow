import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLOY, type Reply } from "../sprint-1/helpers.js";
import { failure, ok, openDetail, resubmitForm, resubmittedDetail, returnedDetail } from "./helpers.js";

// F-06 resubmit form on Request Detail (contract §2.1, AC-F06-21, 25 to 27, and 29).

afterEach(() => vi.unstubAllGlobals());

const RESUBMIT = "POST /api/requests/12/resubmission";
// getByRole, so that a missing form fails as "unable to find", not as an error of the test itself.
const form = () => within(screen.getByRole("region", { name: "Edit and resubmit" }));
const title = () => form().getByLabelText("Title");
const amount = () => form().getByLabelText("Amount (THB)");
const button = () => form().getByRole("button", { name: "Resubmit" });

describe("resubmit form", () => {
  it("TEST-F06-21 / AC-F06-21: it starts with the current values, checks them, and resubmits", async () => {
    const after = resubmittedDetail({ amount: "250.00" });
    const { typing, posts } = await openDetail(PLOY, ok(returnedDetail()), { [RESUBMIT]: ok(after) });

    expect(title()).toHaveValue("Oscilloscope for the electronics lab");
    expect(form().getByLabelText("Description")).toHaveValue("Replace the broken unit in room 401.");
    expect(amount()).toHaveValue("18500.00");
    expect(form().getByText("Reviewer: Mint Chaiyaporn (cannot be changed)")).toBeInTheDocument();

    await typing.clear(title());
    await typing.clear(amount());
    await typing.type(amount(), "0");
    await typing.click(button());
    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
    expect(title()).toHaveAccessibleDescription("Enter a title.");
    expect(title()).toHaveFocus();
    expect(amount()).toHaveAccessibleDescription("Enter an amount greater than 0.");
    expect(posts()).toHaveLength(0);

    await typing.type(title(), "  Oscilloscope  ");
    await typing.clear(amount());
    await typing.type(amount(), "250.00");
    await typing.click(button());

    expect(await screen.findByText("Request resubmitted.")).toBeInTheDocument();
    expect(posts()[0].body).toEqual({
      title: "Oscilloscope",
      description: "Replace the broken unit in room 401.",
      amount: "250.00",
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Submitted");
    expect(resubmitForm()).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Decision" })).not.toBeInTheDocument();
  });

  it("TEST-F06-25 / AC-F06-25: a field message, a server error, and a network failure keep the typed values", async () => {
    const field = "Enter an amount of at most 1,000,000.00 THB.";
    const { typing, posts } = await openDetail(PLOY, ok(returnedDetail()), {
      [RESUBMIT]: [
        failure(400, "VALIDATION_ERROR", "Some fields need attention.", { amount: field }),
        failure(500, "INTERNAL_ERROR", "Something went wrong. Please try again."),
        () => {
          throw new TypeError("network down");
        },
      ],
    });
    await typing.clear(title());
    await typing.type(title(), "A new title");
    await typing.click(button());
    expect(await screen.findByText(field)).toBeInTheDocument();
    expect(amount()).toHaveFocus();

    for (let attempt = 2; attempt <= 3; attempt += 1) {
      await typing.click(button());
      await waitFor(() => expect(posts()).toHaveLength(attempt));
      expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
      expect(title()).toHaveValue("A new title");
    }
  });

  it.each([403, 404])("TEST-F06-26 / AC-F06-26: a %i says the request is not available", async (status) => {
    const { typing } = await openDetail(PLOY, ok(returnedDetail()), { [RESUBMIT]: failure(status, "NOT_FOUND", "Not found.") });
    await typing.click(button());
    expect(await screen.findByText("This request is not available to you.")).toBeInTheDocument();
    expect(screen.queryByText("Oscilloscope for the electronics lab")).not.toBeInTheDocument();
  });

  it("TEST-F06-27 / AC-F06-27: while the call is on its way the button is disabled and one call is sent", async () => {
    let release!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (release = resolve));
    const { typing, posts } = await openDetail(PLOY, ok(returnedDetail()), { [RESUBMIT]: () => pending });
    await typing.click(button());

    const saving = await form().findByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    await typing.click(saving);
    expect(posts()).toHaveLength(1);

    release(ok(resubmittedDetail()));
    await screen.findByText("Request resubmitted.");
  });

  it("TEST-F06-29 / AC-F06-29: a 409 shows its message and loads the request again", async () => {
    const message = "Only a returned request can be resubmitted.";
    const { typing, loads } = await openDetail(PLOY, [ok(returnedDetail()), ok(resubmittedDetail())], {
      [RESUBMIT]: failure(409, "INVALID_TRANSITION", message),
    });
    await typing.click(button());

    expect(await screen.findByText(message)).toBeInTheDocument();
    await waitFor(() => expect(loads()).toHaveLength(2));
    await waitFor(() => expect(resubmitForm()).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Submitted");
  });
});
