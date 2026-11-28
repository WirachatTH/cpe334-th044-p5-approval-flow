# Feature inventory

> **Project Deliverable 1, Part B: feature inventory.** The traceability table is in [`traceability.md`](traceability.md).
> Every requirement in [`srs.md`](srs.md) belongs to one feature (section 1) or one cross-cutting responsibility
> (section 2). The sprint allocation is explained in [`sprints/plan.md`](sprints/plan.md).
> Status: Sprint 1 features implemented; later features specified at this level only.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | | Skeleton created | Repository structure |
| 0.2 | 2026-11-15 | Menelaus122 | Ten features (F-01 to F-10) with description, requirements, dependencies, sprint, and contract link; seven cross-cutting responsibilities (SYS-01 to SYS-07). Sprint 1 requirement lists match the five contracts. | Issue #5 |
| 0.3 | 2026-11-15 | Menelaus122 | The contracts of F-08, F-09, and F-10 are written during Sprint 2, as `plan.md` section 3 says, not at the start of Sprint 3 (the introduction of section 1 and the Contract column of the three features). The sprint of each feature does not change. | Review of PR #48, and the description of PR #50 |
| 0.4 | 2026-11-26 | Menelaus122 | F-04: a rejection needs a category and a reason of at least 10 characters. | Change request #65 (Lab 7) |
| 0.5 | 2026-11-27 | Menelaus122 | F-06: link to its contract and the further requirements it touches. | Issue #71 |
| 0.6 | 2026-11-27 | Menelaus122 | F-07: confirmed values (Q-06), the third reviewer, the further requirements it touches, and the link to its contract. | Issue #76 |
| 0.7 | 2026-11-27 | Menelaus122 | F-05: five demo accounts, following F-07. | Review of PR #77 |
| 0.8 | 2026-11-28 | Menelaus122 | F-08: the link to its contract, its dependencies on F-06 and F-07, and the further requirements it touches. | Issue #79 (F-08) |
| 0.9 | 2026-11-28 | Menelaus122 | F-09: the link to its contract and the requirements it touches. | Issue #84 (F-09) |
| 0.10 | 2026-11-28 | Menelaus122 | F-10: the link to its contract and the requirements it touches. | Issue #84 (F-10) |

---

## 1. Features

Each Sprint 1 feature has an engineering contract in [`sprints/sprint-1/`](sprints/sprint-1/README.md). The contracts of
F-06 and F-07 are written at the start of Sprint 2. The contracts of the Sprint 3 features (F-08, F-09, F-10) are written
during Sprint 2, because Deliverable 2 asks for them ([`sprints/plan.md`](sprints/plan.md) section 3). Every contract is
written before any test or code of its feature.

| ID | Feature | Description | Related requirements | Depends on | Planned sprint | Contract |
|---|---|---|---|---|---|---|
| F-01 | Authentication | Sign in with email and password, stay signed in across reloads, and sign out so that the session ends on the server. Passwords are stored as scrypt hashes, sessions are server-side with an 8-hour life, and repeated failed sign-ins are throttled. | FR-01, FR-02, FR-03; BR-02; NFR-01, NFR-03, NFR-04, NFR-05, NFR-06, NFR-11 | F-05 | 1 | [F-01](sprints/sprint-1/F-01-authentication.md) |
| F-02 | Role-based access control | One route-policy table and one middleware decide, from the server-side session only, which role may call which route; foreign origins are refused on writes; the navigation shows each role only what it can use. | FR-10, FR-12; BR-01, BR-02, BR-09 (role part); NFR-01, NFR-02, NFR-06 | F-01, F-05 | 1 | [F-02](sprints/sprint-1/F-02-access-control.md) |
| F-03 | Submit and view own requests | Submit a purchase or funding request to one chosen reviewer, with validation of title, description, amount, and reviewer; list one's own requests; open one with its decision and history. Adds the request tables, rules, and the append-only history trigger. | FR-04, FR-05, FR-06; BR-03, BR-04, BR-05, BR-06, BR-07, BR-08, BR-13 (submission entry), BR-15; NFR-02, NFR-07, NFR-11 | F-01, F-02, F-05 | 1 | [F-03](sprints/sprint-1/F-03-submit-request.md) |
| F-04 | Review decision and history | The assigned reviewer sees an inbox, approves a request with an optional reason or rejects it with a required category and a reason of at least 10 characters. No self-approval, only `SUBMITTED` can be decided, and two decisions at the same moment cannot both succeed. Every decision adds one permanent history entry. | FR-06, FR-07, FR-08, FR-09; BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-14; NFR-02, NFR-07, NFR-11 | F-02, F-03 | 1 | [F-04](sprints/sprint-1/F-04-review-decision.md) |
| F-05 | Seed data and cloud-ready configuration | The same schema from migrations and the same five demo accounts (four until F-07 is implemented) from an idempotent seed in every environment; all settings from environment variables with no secret in the repository; `/api/health` and `/api/ready`. | FR-11, FR-12; NFR-03, NFR-06, NFR-08, NFR-09, NFR-10 | None (foundation) | 1 | [F-05](sprints/sprint-1/F-05-seed-and-config.md) |
| F-06 | Return and resubmission | The assigned reviewer returns a `SUBMITTED` request with a comment (`RETURNED`); the requester edits and resubmits it under the same number and reviewer; the history shows each return and resubmission. This is the only way to change a request after submission. Decides Q-05 (a reviewer who can no longer decide). | FR-06, FR-07, FR-10, FR-13, FR-14; BR-04, BR-05, BR-08, BR-10, BR-11, BR-13, BR-14, BR-15, BR-16; NFR-02, NFR-07, NFR-11 | F-03, F-04 | 2 | [F-06](sprints/sprint-2/F-06-return-and-resubmission.md) |
| F-07 | Multi-stage approval | A request above 100,000.00 THB needs a second approval from a different reviewer (Q-06). It becomes `APPROVED` only after both approvals, and the reviewer whose turn it is can reject it. A third reviewer account is seeded. | FR-06, FR-07, FR-11, FR-15; BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-14, BR-17; NFR-02, NFR-07, NFR-11 | F-04, F-06 | 2 | [F-07](sprints/sprint-2/F-07-multi-stage-approval.md) |
| F-08 | Filtering, search, and decided requests | Filter and search My Requests, the Review Inbox, and the decided requests by status, date range, amount range, and number or title text; a reviewer's list of requests they decided; paging for the lists (A-04). | FR-05, FR-07, FR-16, FR-17; BR-08, BR-18; NFR-02, NFR-06, NFR-11 | F-03, F-04, F-06, F-07 | 3 | [F-08](sprints/sprint-2/F-08-filtering-and-search.md) |
| F-09 | Decision summaries and reports | Counts and totals by status for a chosen period, and for a reviewer the number approved and rejected, limited to the requests the viewer may see. Decides Q-07 (export). | FR-18; BR-08, BR-18; NFR-01, NFR-02, NFR-06, NFR-11 | F-04, F-07, F-08 | 3 | [F-09](sprints/sprint-3/F-09-summaries-and-reports.md) |
| F-10 | Product hardening | Full accessibility (axe on every main screen), responsive layouts at three sizes, a timed performance run, a decision on a throttle shared between instances (Q-08, D-10), error pages, and a regression run over all earlier features. Signing out also clears other open tabs (UAT finding X-03). | NFR-12, NFR-13, NFR-14; NFR-02, NFR-04, NFR-05, NFR-06, NFR-11, NFR-15 | F-01 to F-09 | 3 | [F-10](sprints/sprint-3/F-10-product-hardening.md) |

## 2. Cross-cutting system responsibilities

These requirements do not belong to one feature. Each is established once and then kept true by every later feature.

| ID | Responsibility | Related requirements | Established in sprint | Verified in sprint (how) |
|---|---|---|---|---|
| SYS-01 | **Safe errors.** Every route answers with one error envelope and fixed messages; no stack trace, SQL, path, connection string, or secret ever reaches a response, and the log records only the error's type. | NFR-06 | 1 (the error handler, F-02) | 1: API tests that force validation and server errors (F-01, F-02, F-05). Each later feature adds its own negative cases. |
| SYS-02 | **Configuration and secrets.** Every setting comes from the environment; every variable is in `.env.example` and `deployment.md`; no secret is in Git, the image, the client bundle, or a log. | NFR-09 | 1 (F-05) | 1: TEST-F05-13 (static check at the release commit), GitHub secret scanning, PR review checklist. Again in Lab 5. |
| SYS-03 | **Backend authorization on every route.** A route is reachable only through the policy table, and record scope is checked in the handler. | NFR-01, NFR-02 | 1 (F-02) | 1: a test calls every route in the policy table without a session and as each role (F-02); F-03 and F-04 test record scope. Every new route in Sprints 2 and 3 needs a policy and a test. |
| SYS-04 | **Data integrity in the database.** The rules that matter (amount range, no self-assignment, rejection reason, decision fields, append-only history) are also database constraints and a trigger, and migrations are backward-compatible. | NFR-07 | 1 (F-03 migrations) | 1: database tests that bypass the API (AC-F03-09, AC-F04-14). Each later migration is additive. |
| SYS-05 | **Persistence, reproducibility, and operations.** Data survives a restart and a redeploy, a fresh clone builds and runs, each deploy is checked and identifiable, and costs stay within the free credit. | NFR-08, NFR-10, NFR-15, NFR-16 | 1 (F-05 and Lab 5) | Lab 5 (Sprint 1 release): checks C-03, C-05, C-06, and the console screenshots. |
| SYS-06 | **Basic usability.** Validation beside the field and linked with `aria-describedby`, every action possible by keyboard, status shown as text. | NFR-11 | 1 (F-01, F-03, F-04 screens) | 1: component tests, and one manual keyboard pass per release (RD-7). Full accessibility is NFR-12 in F-10. |
| SYS-07 | **Visibility scope in every list.** Lists, filters, summaries, and reports show only the requests the viewer may see. | BR-08, BR-18 | 1 (F-03, F-04 handlers) | 1: TEST-F03-11, 13 and TEST-F04-01, 09, 23. Sprint 3 (F-08, F-09) applies the same scope to filters and summaries. |

## 3. Approved changes

| Date | Change | Reason | Approved in (PR) |
|---|---|---|---|
| 2026-11-15 | None since the first complete version | | |
