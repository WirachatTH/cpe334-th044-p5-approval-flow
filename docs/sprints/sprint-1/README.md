# Sprint 1: engineering contracts

> **Project Deliverable 1, Part E.** One contract per Sprint 1 feature, created from
> [`../contract-template.md`](../contract-template.md), plus the Product Definition of Done that every feature and
> every release must meet. Requirements: [`../../srs.md`](../../srs.md). Design: [`../../system-sds.md`](../../system-sds.md).

## Workflow for each feature

1. Write the contract (feature SDS, UI/API/data, AC, STS) and commit it: `docs(F-0X): ... (#N)`.
2. If the review asks for changes, add a new `docs(F-0X): revise ...` commit with a version-history row. Do this before the red tests.
3. Write the tests from the STS, run them, and see them **fail** for the intended reason. Commit them: `test(F-0X): ... (red) (#N)`.
4. Implement until the tests **pass**. Commit: `feat(F-0X): ... (green) (#N)`.
5. Fill in the contract's completion evidence (section 6), and update `docs/traceability.md` with the actual test files and results, which both members can see. Personal working notes (SHAs, raw output) can also go in the git-ignored `private/evidence-log.md`.
6. Move the Issue's card one column at a time: Backlog → Specified → In Progress → PR Review (→ Fixing) → Done.

See `AGENTS.md` section 3 for the full rules.

## Contracts

| Feature | Contract | Issue | Author | Reviewer | Version |
|---|---|---|---|---|---|
| F-01 | [F-01-authentication.md](F-01-authentication.md) | #7 (contract), #9 (implementation) | Menelaus122 | WirachatTH | v0.3 |
| F-02 | [F-02-access-control.md](F-02-access-control.md) | #7 (contract), #9 (implementation) | Menelaus122 | WirachatTH | v0.3 |
| F-03 | [F-03-submit-request.md](F-03-submit-request.md) | #7 (contract), #10 (implementation) | Menelaus122 | WirachatTH | v0.3 |
| F-04 | [F-04-review-decision.md](F-04-review-decision.md) | #7 (contract), #11 (implementation) | Menelaus122 | WirachatTH | v0.7 |
| F-05 | [F-05-seed-and-config.md](F-05-seed-and-config.md) | #7 (contract), #8 (implementation) | Menelaus122 | WirachatTH | v0.4 |

Each contract's own header holds its status (Draft → Agreed → Implemented → Verified) and its version history.

## Product Definition of Done

**A feature or a release is done only when the evidence for every item below exists and can be pointed to.**
Evidence means a commit, a PR, a test run, or a screenshot. An AI agent saying it is done is not evidence.
If an item cannot be met, the work is not done; ship it only with the gap disclosed (FD-12, RD-6).

The last column maps each item to what Deliverable 1 requires of a Definition of Done:
- **Behaviour**: required behaviour implemented
- **Verification**: planned verification executed
- **Tests**: meaningful tests passing
- **Integration**: review and integration complete
- **Docs**: setup and documents current
- **Disclosure**: incomplete work disclosed

### Feature done (every feature PR into `staging`)

| ID | Criterion | Evidence | D1 element |
|---|---|---|---|
| FD-01 | The behaviour matches the **agreed contract version**. Any change found during implementation is a new contract revision commit with its reason, not a silent difference. | Contract version history; the PR diff | Behaviour |
| FD-02 | **Contract before code, and red before green.** The contract commit comes before any test commit. For each business rule, a test commit that fails on the intended assertion comes before the implementation commit that makes it pass. No commits are squashed. | The PR's commit list with the Spec, Red, and Green SHAs; an excerpt of the red output | Verification, Tests |
| FD-03 | **Every AC's planned TEST was run** on the PR's final commit, and all automated tests pass. | The PR's test table (command, tested commit, pass/fail/skip counts); the CI run once CI exists (Lab 5) | Verification, Tests |
| FD-04 | **The tests are meaningful.** They assert the observable outcome (status, body, and persisted state), including the contract's negative, boundary, and role cases. No `.only` or `.skip` is committed, and no assertion is removed or loosened to pass. | The reviewer reads the tests; a grep for `.only` and `.skip` finds none in the diff | Tests |
| FD-05 | **Access is enforced in the backend.** Every new route is in `ROUTE_POLICIES` (TEST-F02-06 passes). Every protected operation the feature adds is tested through the API as the wrong role, and as a non-owner where records are involved. | API test names in the PR; TEST-F02-06 result | Behaviour, Tests |
| FD-06 | **Data changes are safe.** Migrations are backward-compatible with the previously deployed revision (additive where possible), apply to an empty database and to the current `staging` schema, and leave the seed idempotent. | Migrate and seed output in the PR | Behaviour |
| FD-07 | **No secrets, and configuration is documented.** No password, token, or connection string is in the diff, logs, or screenshots. Every new environment variable is in `.env.example` and `deployment.md`. | PR author checklist; the secret scan; the env diff | Docs |
| FD-08 | **The UI states are complete.** Validation, loading, empty, and error states follow SDS §4.2, and status is shown as text. The manual keyboard pass is done once per release (RD-7). | Component tests | Behaviour |
| FD-09 | **The server and client build and type-check** without errors. | Build and type-check commands with output in the PR | Tests |
| FD-10 | **Review and integration.** The PR is into `staging`, linked to its Issue, with the template filled in. The other member reviews it with a specific comment, and it is merged with a merge commit. The review's follow-ups are done or tracked, the Issue is closed, and the card is Done. | The PR page; the board | Integration |
| FD-11 | **The documents are current.** The contract's completion evidence (§6) is filled in, and the README setup still works. The traceability results are completed once per release (RD-3). | The documentation diff | Docs |
| FD-12 | **Incomplete work is disclosed.** Known limitations, and any failed or skipped tests, are written in the contract's §6 and in the PR notes. | Contract §6; PR notes | Disclosure |

### Release done (every release PR from `staging` to `main`)

| ID | Criterion | Evidence | D1 element |
|---|---|---|---|
| RD-1 | Every feature in the release meets *Feature done*, or is excluded with the reason disclosed. | The PRs listed in the release PR | Behaviour, Integration |
| RD-2 | **An integration run on the release-candidate commit passes:** the full server and client suites, and the Playwright journeys (#12). | Commands, commit, and pass/fail/skip counts in the release PR | Verification, Tests |
| RD-3 | **Every Sprint AC is accounted for** in the AC → planned TEST → actual test → result table in `docs/traceability.md`, visible to both members. | `docs/traceability.md` at the release commit, copied into the Deliverable 1 PDF Part F | Verification |
| RD-4 | **The release PR is reviewed and the release is identified.** The other member reviews the release PR with a specific comment, and it is merged with a merge commit. The release is tagged (for example `v1.0.0-sprint1`). Once the pipeline exists (Lab 5), the deploy ran and the running revision is the release commit. | Release PR; tag; the deploy run and Cloud Run revision | Integration |
| RD-5 | **A fresh clone builds and runs** by following the README (Lab 5 C-03). | Fresh-clone command output | Docs |
| RD-6 | **The evidence is collected, and gaps are disclosed.** The Part F evidence exists: demo screenshots without secrets, test output, and the commit history. Failed or skipped tests and incomplete work are stated in the PDF. | `docs/traceability.md`; the PDF; working notes in `private/evidence-log.md` | Disclosure |
| RD-7 | **A manual keyboard pass over the main screens finds no action that needs a mouse.** The screens are Login, My Requests, New Request, Request Detail with the decision panel, and Review Inbox. | A short checklist with the date and commit in the release PR | Verification |

### Agreement

This Definition of Done applies to every feature and release from Sprint 1 onwards.
- **Agreed by both members:** Menelaus122 wrote it in this PR, and WirachatTH agrees to it through the review that approves the PR.
- **Changes** need a new version-history row and the other member's approval in review.

## Release verification journeys (Issue #12)

Three Playwright journeys check the integrated Sprint 1 increment through the real UI, API, and database, with the
seeded synthetic accounts. They are verification tests for the release, not a new feature: every behaviour they use
is already specified and tested in F-01 to F-05, so they pass when first written and are not red evidence.
Each journey makes its own requests with a unique title, so a run does not depend on earlier runs.

| TEST ID | Journey | Steps | Expected result | Related ACs |
|---|---|---|---|---|
| TEST-REL-01 | Happy path | Ploy (requester) signs in, submits a request to Mint, and logs out. Mint (reviewer) signs in, finds it in the Review Inbox, opens it, approves it with a reason, and logs out. Ploy signs in again and opens the request from My Requests. | After the submission the confirmation shows a request number. After Mint's decision the request is `APPROVED`. Ploy's list shows `Approved`, and the detail shows the decider (Mint), the reason, and a history of `SUBMITTED` then `APPROVED`, the same after a reload. | AC-F01-14, AC-F01-18, AC-F03-15, AC-F03-18, AC-F03-19, AC-F04-13, AC-F04-15, AC-F04-18 |
| TEST-REL-02 | Business-rule rejection | (a) Ploy submits an amount of `0`. (b) Ploy submits a valid request; Mint presses **Reject** with a blank reason. (c) Mint's session then sends the same rejection to the API directly. | (a) "Enter an amount greater than 0." is shown, nothing is sent, and no request with that title exists after a reload. (b) "Enter a reason to reject this request." is shown and the request is still in the inbox after a reload. (c) `400 VALIDATION_ERROR` on `reason`; the request is still `SUBMITTED` with one history entry. | AC-F03-16, AC-F04-06, AC-F04-17 |
| TEST-REL-03 | Access restriction | Ploy opens `/reviews` in the browser. Through the API, with separate sessions: no session calls the inbox; Ploy calls the inbox and decides her own request; Korn (a reviewer the request is not assigned to) opens and decides it. | The browser shows "This page is not available to you." and no inbox. The API answers `401` without a session, `403 FORBIDDEN` to Ploy for both calls, and `404 NOT_FOUND` to Korn for both calls. The request is unchanged: `SUBMITTED`, one history entry. | AC-F02-01, AC-F02-03, AC-F02-12, AC-F03-13, AC-F04-09, AC-F04-10 |

File: `client/e2e/sprint-1/journeys.spec.ts`. Command: `cd client && npm run e2e`, with the API running on seeded data.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure (#2) |
| 0.2 | 2026-11-14 | Menelaus122 | Product Definition of Done defined (feature and release levels, each item with its evidence); workflow gains the review-revision and board steps; contract index updated | Issue #7 |
| 0.3 | 2026-11-14 | Menelaus122 | The traceability results live in `docs/traceability.md`, not the private log. FD-06 says "backward-compatible" instead of "additive". The index shows the version only, with status left to each contract's header. The manual keyboard pass (now RD-7) and the traceability results (RD-3) move to release level. | Review of PR #25 |
| 0.4 | 2026-11-15 | Menelaus122 | Added the three release verification journeys (TEST-REL-01 to 03) that Issue #12 asks for, before their tests. | Issue #12 |
