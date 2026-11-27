import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINT, decidedDetail, requestDetail, type Reply } from "../sprint-1/helpers.js";
import {
  COMMENT, COMMENT_LABEL, decisionPanel, failure, ok, openDetail, resubmittedDetail, returnPanel, returnedDetail,
} from "./helpers.js";

// F-06 return panel on Request Detail (contract §2.1, AC-F06-19, 22, and 25 to 27).

afterEach(() => vi.unstubAllGlobals());

const RETURN = "POST /api/requests/12/return";
const submitted = () => ok(requestDetail());
// getByRole, so that a missing panel fails as "unable to find", not as an error of the test itself.
const panel = () => screen.getByRole("region", { name: "Return for changes" });
const returnButton = () => within(panel()).getByRole("button", { name: "Return for changes" });
const comment = () => screen.getByLabelText(COMMENT_LABEL);

describe("return panel", () => {
  it("TEST-F06-19 / AC-F06-19: blank and too long comments show messages and send nothing; a valid one returns", async () => {
    const { typing, posts } = await openDetail(MINT, submitted(), { [RETURN]: ok(returnedDetail()) });

    await typing.click(returnButton());
    const blank = "Enter a comment to return this request.";
    expect(await screen.findByText(blank)).toBeInTheDocument();
    expect(comment()).toHaveAccessibleDescription(blank);
    expect(comment()).toHaveFocus();

    await typing.paste("x".repeat(1001));
    expect(within(panel()).getByText("1001 / 1000")).toBeInTheDocument();
    await typing.click(returnButton());
    expect(await screen.findByText("Comment must be 1,000 characters or fewer.")).toBeInTheDocument();
    expect(posts()).toHaveLength(0);

    await typing.clear(comment());
    await typing.type(comment(), `  ${COMMENT}  `);
    await typing.click(returnButton());

    expect(await screen.findByText("Request returned.")).toBeInTheDocument();
    expect(posts()).toHaveLength(1);
    expect(posts()[0].body).toEqual({ comment: COMMENT });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Returned");
    expect(returnPanel()).not.toBeInTheDocument();
    expect(decisionPanel()).not.toBeInTheDocument();
  });

  it("TEST-F06-22 / AC-F06-22: an approval of a resubmitted request sends its revision", async () => {
    const { typing, posts } = await openDetail(MINT, ok(resubmittedDetail()), {
      "POST /api/requests/12/decision": ok(decidedDetail("APPROVED")),
    });
    await typing.click(screen.getByRole("button", { name: "Approve" }));
    await screen.findByText("Request approved.");
    expect(posts()[0].body).toEqual({ decision: "APPROVE", revision: 1 });
  });

  it("TEST-F06-22 / AC-F06-22: a rejection of a resubmitted request sends its revision", async () => {
    const reason = "Already ordered last week.";
    const { typing, posts } = await openDetail(MINT, ok(resubmittedDetail()), {
      "POST /api/requests/12/decision": ok(decidedDetail("REJECTED", reason, "DUPLICATE")),
    });
    await typing.type(screen.getByLabelText("Reason (required to reject)"), reason);
    await typing.selectOptions(screen.getByLabelText("Rejection category (required to reject)"), "Duplicate request");
    await typing.click(screen.getByRole("button", { name: "Reject" }));
    await screen.findByText("Request rejected.");
    expect(posts()[0].body).toEqual({ decision: "REJECT", reason, category: "DUPLICATE", revision: 1 });
  });

  it("TEST-F06-22 / AC-F06-22: a return sends the revision, and a stale answer is shown and the request loaded again", async () => {
    const stale = "This request was changed after you opened it. Check it again.";
    const { typing, posts, loads } = await openDetail(MINT, ok(resubmittedDetail()), {
      [RETURN]: failure(409, "STALE_REVISION", stale),
    });
    await typing.type(comment(), COMMENT);
    await typing.click(returnButton());

    expect(await screen.findByText(stale)).toBeInTheDocument();
    expect(posts()[0].body).toEqual({ comment: COMMENT, revision: 1 });
    await waitFor(() => expect(loads()).toHaveLength(2));
  });

  it("TEST-F06-25 / AC-F06-25: a field message, a server error, and a network failure keep the typed comment", async () => {
    const field = "Comment must be 1,000 characters or fewer.";
    const { typing, posts } = await openDetail(MINT, submitted(), {
      [RETURN]: [
        failure(400, "VALIDATION_ERROR", "Some fields need attention.", { comment: field }),
        failure(500, "INTERNAL_ERROR", "Something went wrong. Please try again."),
        () => {
          throw new TypeError("network down");
        },
      ],
    });
    await typing.type(comment(), COMMENT);
    await typing.click(returnButton());
    expect(await screen.findByText(field)).toBeInTheDocument();
    expect(comment()).toHaveFocus();

    for (let attempt = 2; attempt <= 3; attempt += 1) {
      await typing.click(returnButton());
      await waitFor(() => expect(posts()).toHaveLength(attempt));
      expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
      expect(comment()).toHaveValue(COMMENT);
    }
  });

  it.each([403, 404])("TEST-F06-26 / AC-F06-26: a %i says the request is not available", async (status) => {
    const { typing } = await openDetail(MINT, submitted(), { [RETURN]: failure(status, "NOT_FOUND", "Not found.") });
    await typing.type(comment(), COMMENT);
    await typing.click(returnButton());
    expect(await screen.findByText("This request is not available to you.")).toBeInTheDocument();
    expect(screen.queryByText("Oscilloscope for the electronics lab")).not.toBeInTheDocument();
  });

  it("TEST-F06-27 / AC-F06-27: while the call is on its way the button is disabled and one call is sent", async () => {
    let release!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (release = resolve));
    const { typing, posts } = await openDetail(MINT, submitted(), { [RETURN]: () => pending });
    await typing.type(comment(), COMMENT);
    await typing.click(returnButton());

    const saving = await within(panel()).findByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    await typing.click(saving);
    expect(posts()).toHaveLength(1);

    release(ok(returnedDetail()));
    await screen.findByText("Request returned.");
  });
});
