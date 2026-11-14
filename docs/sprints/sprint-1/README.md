# Sprint 1: engineering contracts

> **Project Deliverable 1, Part E.** One contract per Sprint 1 feature, created from
> [`../contract-template.md`](../contract-template.md).
> Status: skeleton. Feature titles are working names; confirm or change them with [`../../features.md`](../../features.md).

## Workflow for each feature

1. Write the contract (feature SDS, UI/API/data, AC, STS) and commit it: `docs(F-0X): ... (#N)`.
2. Write the tests from the STS, run them, and see them **fail**. Commit them: `test(F-0X): ... (red) (#N)`.
3. Implement until the tests **pass**. Commit: `feat(F-0X): ... (green) (#N)`.
4. Fill in the contract's completion evidence (section 6) and record the SHAs in `private/evidence-log.md`.

See `AGENTS.md` section 3 for the full rules.

## Contracts

| Feature | Contract | Issue | Author | Reviewer | Status |
|---|---|---|---|---|---|
| F-01 | [F-01-authentication.md](F-01-authentication.md) | #7 (contract), #9 (implementation) | | | Skeleton |
| F-02 | [F-02-access-control.md](F-02-access-control.md) | #7 (contract), #9 (implementation) | | | Skeleton |
| F-03 | [F-03-submit-request.md](F-03-submit-request.md) | #7 (contract), #10 (implementation) | | | Skeleton |
| F-04 | [F-04-review-decision.md](F-04-review-decision.md) | #7 (contract), #11 (implementation) | | | Skeleton |
| F-05 | [F-05-seed-and-config.md](F-05-seed-and-config.md) | #7 (contract), #8 (implementation) | Menelaus122 | WirachatTH | Draft |

## Product Definition of Done

<!-- Agree on these as a team and record the agreement in the version history. -->

A feature or release is **done** only when the evidence for each item exists. An AI agent's claim is not evidence.

- [ ] The required behaviour is implemented and matches the agreed contract (any revisions are recorded)
- [ ] The planned verification (STS) was executed; every AC has a result
- [ ] Meaningful tests pass. Failed and skipped tests are reported, not hidden.
- [ ] Access rules are enforced and tested in the backend
- [ ] A teammate reviewed the PR with a specific comment; it was merged into `staging`, integrated, and released to `main`
- [ ] Setup and documents are current (README, contracts, traceability, `deployment.md`)
- [ ] There are no secrets in the repo, logs, or screenshots
- [ ] Incomplete work is disclosed

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | | Skeleton created | Repository structure |
