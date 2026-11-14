<!--
Write this as the author, in your own words, like a report to your teammate.
- Open with one paragraph: "I have done Issue N: ...". Say what now works, what you found, and what you fixed.
- Under each acceptance criterion, say how you know it is met: the test, the command, the number.
  Leave a box unticked if it is not met yet, and say why.
- Give real commands, the tested commit, and the runner's own counts. Say what you did not verify.
- Fill in the "Pair work" line: "none", or both members and who did what.
- Release PRs (`staging` -> `main`) fill in the "Release PR only" section; normal PRs delete it.
- No secrets, passwords, connection strings, or keys. No "Generated with ..." footers.
- Base `staging` (release PRs: `staging` -> `main`). Merge with "Create a merge commit".
  The author never approves or merges their own PR.
-->

I have done Issue N: ...

Closes #N

Pair work: <none, or both members' GitHub names and who did what>

## 🎯 Acceptance Criteria Verification

<!-- One item per AC from the Issue or contract, with its ID, followed by the evidence. -->

- [ ] **AC-F0X-01: <criterion>.** <how it is met: test name, command, result>

## 🧪 Automated Test Evidence

<!-- The baseline before your change, then the run on your final commit. -->

| Suite | Command | Result |
| :--- | :--- | :--- |
| | | |

Tested commit: `<sha>`

**Red before green**

<!-- For rule work. If there is none (docs, ci, chore), replace this table with one line saying so. -->

| Step | Commit | Evidence |
| :--- | :--- | :--- |
| Contract (`docs`) | | |
| Failing test (`test`, red) | | <test name and the assertion it failed on> |
| Implementation (`feat`, green) | | <the same tests passing> |

## 🔁 Follow-ups from earlier reviews

<!-- Point by point. Delete this section if there were none. -->

## 📋 Notes for reviewer

1. <What changed and where, and any choice the reviewer may want to change.>
2. <What you did not verify; known limitations; failed or skipped tests.>
3. <Documents updated. GitHub does not close the Issue when a PR merges into `staging`; close it by hand.>

## 🚀 Release PR only (`staging` → `main`)

<!-- Delete this section on a normal PR. -->

- PRs included in this release: #
- Integration and acceptance checks on `staging` (command, commit, result):
- Release tag to create after the merge (for example `v1.0.0-sprint1`):
- Deploy workflow run, and the running Cloud Run revision with its commit (after the merge; Lab 5 C-06):

---

<details>
<summary>Reviewer checklist (the reviewer ticks these, not the author)</summary>

- [ ] I am not the author, and the base branch is correct
- [ ] The Issue, feature, AC, and TEST IDs match the contract
- [ ] The tests assert the AC, including negative, boundary, and role cases
- [ ] CI passed, or I ran the tests locally (result: ___)
- [ ] Authorization is enforced in the backend, not only in the UI
- [ ] There are no secrets in code, docs, screenshots, or logs
- [ ] The history keeps `docs` -> `test` (red) -> `feat` (green), and I will merge with "Create a merge commit"

Write a specific check, question, finding, or reason for approval in the review comment.

</details>
