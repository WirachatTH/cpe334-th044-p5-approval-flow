# Sprint 1: engineering contracts

> **Project Deliverable 1, Part E.** One contract per Sprint 1 feature, created from
> [`../contract-template.md`](../contract-template.md), plus the Product Definition of Done that every feature and
> every release must meet. Requirements: [`../../srs.md`](../../srs.md). Design: [`../../system-sds.md`](../../system-sds.md).

## Workflow for each feature

1. Write the contract (feature SDS, UI/API/data, AC, STS) and commit it: `docs(F-0X): ... (#N)`.
2. If the review asks for changes, add a new `docs(F-0X): revise ...` commit with a version-history row. Do this before the red tests.
3. Write the tests from the STS, run them, and see them **fail** for the intended reason. Commit them: `test(F-0X): ... (red) (#N)`.
4. Implement until the tests **pass**. Commit: `feat(F-0X): ... (green) (#N)`.
5. Fill in the contract's completion evidence (section 6) and record the SHAs in `private/evidence-log.md`.
6. Move the Issue's card one column at a time: Backlog → Specified → In Progress → PR Review (→ Fixing) → Done.

See `AGENTS.md` section 3 for the full rules.

## Contracts

| Feature | Contract | Issue | Author | Reviewer | Status |
|---|---|---|---|---|---|
| F-01 | [F-01-authentication.md](F-01-authentication.md) | #7 (contract), #9 (implementation) | Menelaus122 | WirachatTH | v0.2 approved in #23; revision due before the #9 red tests |
| F-02 | [F-02-access-control.md](F-02-access-control.md) | #7 (contract), #9 (implementation) | Menelaus122 | WirachatTH | v0.2 approved in #23; revision due before the #9 red tests |
| F-03 | [F-03-submit-request.md](F-03-submit-request.md) | #7 (contract), #10 (implementation) | Menelaus122 | WirachatTH | v0.2 in review (#24) |
| F-04 | [F-04-review-decision.md](F-04-review-decision.md) | #7 (contract), #11 (implementation) | Menelaus122 | WirachatTH | v0.2 in review (#24) |
| F-05 | [F-05-seed-and-config.md](F-05-seed-and-config.md) | #7 (contract), #8 (implementation) | Menelaus122 | WirachatTH | v0.3 approved in #21; v0.4 due before the #8 red tests |

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
| FD-06 | **Data changes are safe.** Migrations are additive, apply to an empty database and to the current `staging` schema, and leave the seed idempotent. | Migrate and seed output in the PR | Behaviour |
| FD-07 | **No secrets, and configuration is documented.** No password, token, or connection string is in the diff, logs, or screenshots. Every new environment variable is in `.env.example` and `deployment.md`. | PR author checklist; the secret scan; the env diff | Docs |
| FD-08 | **The UI states are complete.** Validation, loading, empty, and error states follow SDS §4.2; actions work from the keyboard; status is shown as text. | Component tests; a manual keyboard pass, noted in the PR | Behaviour |
| FD-09 | **The server and client build and type-check** without errors. | Build and type-check commands with output in the PR | Tests |
| FD-10 | **Review and integration.** The PR is into `staging`, linked to its Issue, with the template filled in. The other member reviews it with a specific comment, and it is merged with a merge commit. The review's follow-ups are done or tracked, the Issue is closed, and the card is Done. | The PR page; the board | Integration |
| FD-11 | **The documents are current.** The contract's completion evidence (§6) is filled in, `docs/traceability.md` has the actual test files and results, and the README setup still works. | The documentation diff | Docs |
| FD-12 | **Incomplete work is disclosed.** Known limitations, and any failed or skipped tests, are written in the contract's §6 and in the PR notes. | Contract §6; PR notes | Disclosure |

### Release done (every release PR from `staging` to `main`)

| ID | Criterion | Evidence | D1 element |
|---|---|---|---|
| RD-1 | Every feature in the release meets *Feature done*, or is excluded with the reason disclosed. | The PRs listed in the release PR | Behaviour, Integration |
| RD-2 | **An integration run on the release-candidate commit passes:** the full server and client suites, and the Playwright journeys (#12). | Commands, commit, and pass/fail/skip counts in the release PR | Verification, Tests |
| RD-3 | **Every Sprint AC is accounted for** in the AC → planned TEST → actual test → result table. | The table in `private/evidence-log.md`, then in the Deliverable 1 PDF Part F | Verification |
| RD-4 | **The release PR is reviewed and the release is identified.** The other member reviews the release PR with a specific comment, and it is merged with a merge commit. The release is tagged (for example `v1.0.0-sprint1`). Once the pipeline exists (Lab 5), the deploy ran and the running revision is the release commit. | Release PR; tag; the deploy run and Cloud Run revision | Integration |
| RD-5 | **A fresh clone builds and runs** by following the README (Lab 5 C-03). | Fresh-clone command output | Docs |
| RD-6 | **The evidence is collected, and gaps are disclosed.** The Part F evidence exists: demo screenshots without secrets, test output, and the commit history. Failed or skipped tests and incomplete work are stated in the PDF. | `private/evidence-log.md`; the PDF | Disclosure |

### Agreement

This Definition of Done applies to every feature and release from Sprint 1 onwards.
- **Agreed by both members:** Menelaus122 wrote it in this PR, and WirachatTH agrees to it through the review that approves the PR.
- **Changes** need a new version-history row and the other member's approval in review.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure (#2) |
| 0.2 | 2026-11-14 | Menelaus122 | Product Definition of Done defined (feature and release levels, each item with its evidence); workflow gains the review-revision and board steps; contract index updated | Issue #7 |
