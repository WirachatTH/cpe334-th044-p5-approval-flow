<!--
PR rules (see AGENTS.md):
- Base branch: `staging`. Release PRs only: `staging` → `main`.
- One Issue per PR. Branch name: type/<issue#>-short-name.
- The AUTHOR must NOT approve or merge this PR. The teammate reviews and merges.
- Merge with "Create a merge commit". Never squash or rebase: that would hide the docs → test (red) → feat (green) history.
- No secrets, passwords, connection strings, or keys anywhere in this PR, its screenshots, or its logs.
- Labels: `sprint-1` / `deliverable-1` / `lab5` as applicable.
-->

## Linked Issue

Closes #<!-- Issue number -->

## Type

- [ ] feat
- [ ] fix
- [ ] docs
- [ ] test
- [ ] refactor
- [ ] build
- [ ] ci
- [ ] chore
- [ ] release (`staging` → `main`)

## Summary

<!-- What changed and why, in 2–5 bullets. -->

-

## Traceability

| Item | IDs |
|---|---|
| Requirements | <!-- FR-.., BR-.., NFR-.. --> |
| Feature / contract (version) | <!-- F-0X, docs/sprints/sprint-1/F-0X-....md vX.Y --> |
| Acceptance criteria | <!-- AC-F0X-01, ... --> |
| Tests (STS) | <!-- TEST-F0X-01, ... --> |
| Lab 5 checks / requirements | <!-- C-0X / R-XX, or N/A --> |

## Contract-first / TDD sequence

| Step | Commit SHA | Notes |
|---|---|---|
| 1. Contract / STS (`docs:`) | | |
| 2. Failing test (`test:`, red) | | Failing test name and the reason it failed |
| 3. Implementation (`feat:`, green) | | |

<!-- If this PR has no rule work (docs-only, ci, chore), write: "N/A because ..." -->

## Test results

- Command(s):
- Tested commit:
- Result: passed `__` / failed `__` / skipped `__`
- CI run link:

<details>
<summary>Output excerpt (summary lines only, no secrets)</summary>

```text

```

</details>

Failed or skipped tests, and why:

## Author checklist

- [ ] Branched from the latest `staging`; the branch is named `type/<issue#>-short-name`
- [ ] The contract was committed before the tests, and the failing test before the implementation (or N/A is explained above)
- [ ] I ran the tests myself on the tested commit above
- [ ] No test was skipped, deleted, or weakened to make it pass
- [ ] I checked the diff: no `.env`, no `private/`, no secrets or key files, no real personal data
- [ ] Docs are updated (contract version history, `docs/traceability.md`, README / `deployment.md` if setup or env vars changed)
- [ ] Pair work: both members are named below, and the commits carry a `Co-authored-by:` trailer

Pair work / co-authors:

## Release PR only (`staging` → `main`)

<!-- Delete this section for normal PRs. -->

- PRs included in this release: #
- Integration/system tests and acceptance checks run on `staging` (command, commit, result):
- Release tag to create after merge (e.g. `v1.0.0-sprint1`):
- Deployment run / running revision (after merge):

## Reviewer checklist (teammate only; the author must not tick these)

- [ ] I am not the author of this PR
- [ ] The base branch is correct (`staging`, or `main` for a release PR)
- [ ] The Issue, feature, AC, and TEST IDs match the contract
- [ ] I read the tests: they assert the AC, including negative, boundary, and role-restriction cases, not only "no error"
- [ ] CI passed on the latest commit, or I ran the tests locally (result: ___)
- [ ] Authorization is enforced in the backend, not only by hiding UI
- [ ] There are no secrets, connection strings, or real passwords in code, docs, screenshots, or logs
- [ ] The history keeps the `docs` → `test` (red) → `feat` (green) order, and I will merge with "Create a merge commit"

> **Reviewer:** in your GitHub review comment, write a **specific** check, question, finding, or reason for
> approval, not just "LGTM". Example: *"Ran TEST-F04-03 locally: a reviewer deciding their own request gets
> 403 and no history row is written."*
