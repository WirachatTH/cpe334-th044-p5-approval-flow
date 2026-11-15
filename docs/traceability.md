# Requirements traceability

> **Project Deliverable 1, Part B: requirement → feature/responsibility → sprint → verification.**
> Every baseline FR, BR, and important NFR from [`srs.md`](srs.md) appears in section 1. The features are in
> [`features.md`](features.md). Later-sprint requirements have a feature and a sprint now; their AC and TEST IDs are added
> when their contract is written.
> Status: Sprint 1 requirements verified at the commit named in section 4; later sprints planned.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | | Skeleton created | Repository structure |
| 0.2 | 2026-11-15 | Menelaus122 | Section 1 covers all 18 FR, 18 BR, and 16 NFR. Sprint 1 rows link the AC IDs of the five contracts. Sections 2 and 3 filled. Section 4 added: AC → planned TEST → actual test → result for the 108 Sprint 1 ACs, from a real run. | Issue #5; Definition of Done RD-3 |

---

## 1. Traceability table

How to read it:
- Every Sprint 1 AC has one TEST with the same number: `AC-F04-09` is checked by `TEST-F04-09`. Section 4 lists each pair with the actual test file, test name, and result.
- A status of **Verified** means every linked test passed in the run in section 4. **Planned** means the feature and sprint are allocated and the AC and TEST IDs do not exist yet.
- `SYS-nn` is a cross-cutting responsibility from [`features.md`](features.md) section 2.

| Requirement | Feature or responsibility | Sprint | Verification (AC / TEST) | Status |
|---|---|---|---|---|
| FR-01 Sign in | F-01 | 1 | AC-F01-01, AC-F01-02, AC-F01-03, AC-F01-04, AC-F01-05, AC-F01-06, AC-F01-14, AC-F01-15 | Verified |
| FR-02 Sign out | F-01 | 1 | AC-F01-12, AC-F01-13, AC-F01-18, AC-F01-21 | Verified |
| FR-03 Stay signed in | F-01 | 1 | AC-F01-09, AC-F01-17, AC-F01-19 | Verified |
| FR-04 Submit a request | F-03 | 1 | AC-F03-01, AC-F03-02, AC-F03-10, AC-F03-15, AC-F03-16, AC-F03-17, AC-F03-20 | Verified |
| FR-05 List own requests | F-03 | 1 | AC-F03-11, AC-F03-18, AC-F03-20, AC-F03-21 | Verified |
| FR-06 Request detail and history | F-03, F-04 | 1 | AC-F03-12, AC-F03-19, AC-F03-21, AC-F04-13 | Verified |
| FR-07 Review inbox | F-04 | 1 | AC-F04-01, AC-F04-02, AC-F04-15, AC-F04-16, AC-F04-20, AC-F04-23 | Verified |
| FR-08 Approve | F-04 | 1 | AC-F04-03, AC-F04-04, AC-F04-18, AC-F04-20 | Verified |
| FR-09 Reject with a reason | F-04 | 1 | AC-F04-05, AC-F04-13 | Verified |
| FR-10 Navigation by role | F-02 | 1 | AC-F02-11, AC-F02-12 | Verified |
| FR-11 Seeded accounts | F-05 | 1 | AC-F05-02, AC-F05-03, AC-F05-19 | Verified |
| FR-12 Health and readiness | F-02, F-05 | 1 | AC-F02-13, AC-F05-08, AC-F05-09, AC-F05-10 | Verified |
| FR-13 Return for changes | F-06 | 2 | AC and TEST IDs are defined in the F-06 contract at the start of Sprint 2 | Planned |
| FR-14 Edit and resubmit | F-06 | 2 | AC and TEST IDs are defined in the F-06 contract at the start of Sprint 2 | Planned |
| FR-15 Second approval | F-07 | 2 | AC and TEST IDs are defined in the F-07 contract at the start of Sprint 2 | Planned |
| FR-16 Filter and search | F-08 | 3 | AC and TEST IDs are defined in the F-08 contract at the start of Sprint 3 | Planned |
| FR-17 Decided requests | F-08 | 3 | AC and TEST IDs are defined in the F-08 contract at the start of Sprint 3 | Planned |
| FR-18 Summaries | F-09 | 3 | AC and TEST IDs are defined in the F-09 contract at the start of Sprint 3 | Planned |
| BR-01 Session required | F-02 | 1 | AC-F02-01 | Verified |
| BR-02 One role, from the session | F-02 | 1 | AC-F02-07 | Verified |
| BR-03 Requester is the session user | F-03 | 1 | AC-F03-03 | Verified |
| BR-04 Amount range | F-03 | 1 | AC-F03-05, AC-F03-09 | Verified |
| BR-05 Title and description | F-03 | 1 | AC-F03-06 | Verified |
| BR-06 Reviewer rule | F-03 | 1 | AC-F03-07, AC-F03-08, AC-F03-09, AC-F03-10 | Verified |
| BR-07 Number and first status | F-03 | 1 | AC-F03-01, AC-F03-03, AC-F03-04, AC-F03-09 | Verified |
| BR-08 Who can see a request | F-03, F-04 (SYS-07) | 1 | AC-F03-11, AC-F03-12, AC-F03-13, AC-F04-01, AC-F04-09 | Verified |
| BR-09 Only the assigned reviewer decides | F-02, F-04 | 1 | AC-F02-03, AC-F04-09, AC-F04-10, AC-F04-16 | Verified |
| BR-10 No self-approval | F-04 | 1 | AC-F04-08, AC-F04-23 | Verified |
| BR-11 Only SUBMITTED is decided | F-04 | 1 | AC-F04-07, AC-F04-11, AC-F04-19 | Verified |
| BR-12 Rejection reason | F-04 | 1 | AC-F04-04, AC-F04-05, AC-F04-06, AC-F04-14, AC-F04-17, AC-F04-21, AC-F04-22 | Verified |
| BR-13 Append-only history | F-03, F-04 | 1 | AC-F03-01, AC-F04-03, AC-F04-05, AC-F04-14 | Verified |
| BR-14 Competing decisions | F-04 | 1 | AC-F04-12, AC-F04-19 | Verified |
| BR-15 No edit after submission | F-03 | 1 | AC-F03-14 | Verified |
| BR-16 Return rules | F-06 | 2 | AC and TEST IDs are defined in the F-06 contract at the start of Sprint 2 | Planned |
| BR-17 Multi-stage threshold | F-07 | 2 | AC and TEST IDs are defined in the F-07 contract at the start of Sprint 2; the threshold and status name are provisional (Q-06) | Planned |
| BR-18 Scope of lists and reports | F-08, F-09 (SYS-07) | 3 | AC and TEST IDs are defined in the F-08 contract at the start of Sprint 3; Sprint 1 applies it to the two lists that exist (TEST-F03-11, TEST-F04-01) | Planned |
| NFR-01 Authentication enforced | F-01, F-02, F-05 (SYS-03) | 1 | AC-F01-09, AC-F02-01, AC-F02-02, AC-F02-09, AC-F05-24 | Verified |
| NFR-02 Authorization in the backend | F-02, F-03, F-04 (SYS-03) | 1 | AC-F02-03, AC-F02-04, AC-F02-05, AC-F02-06, AC-F02-07, AC-F02-08, AC-F02-09, AC-F02-12, AC-F02-14, AC-F03-13, AC-F04-09, AC-F04-10 | Verified |
| NFR-03 Password hashing | F-01, F-05 | 1 | AC-F01-01, AC-F05-05, AC-F05-07 | Verified |
| NFR-04 Session protection | F-01 | 1 | AC-F01-01, AC-F01-06, AC-F01-10, AC-F01-11, AC-F01-12, AC-F01-19, AC-F01-21 | Verified |
| NFR-05 Sign-in throttle | F-01 | 1 | AC-F01-05, AC-F01-07, AC-F01-08, AC-F01-16, AC-F01-20 | Verified |
| NFR-06 Safe errors | F-01, F-02, F-05 (SYS-01) | 1 | AC-F01-04, AC-F02-05, AC-F02-10, AC-F02-13, AC-F02-15, AC-F05-10, AC-F05-24, AC-F05-25 | Verified |
| NFR-07 Database integrity | F-03, F-04 (SYS-04) | 1 | AC-F03-09, AC-F04-14 | Verified |
| NFR-08 Persistence | F-05, SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 check C-05: a request created before a restart and a redeploy is still there afterwards, with before and after evidence on the deployed service | Planned |
| NFR-09 Configuration and secrets | F-05 (SYS-02) | 1 | AC-F05-03, AC-F05-04, AC-F05-05, AC-F05-06, AC-F05-18, AC-F05-20, AC-F05-21, AC-F05-22, AC-F05-27 | Verified |
| NFR-10 Reproducible build | F-05, SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 check C-03: a fresh clone builds, migrates, seeds, and answers 200 on `/api/ready` | Planned |
| NFR-11 Basic usability | F-01, F-03, F-04 (SYS-06) | 1 | AC-F01-15, AC-F03-16, AC-F03-18, AC-F04-17 | Verified (automated, including the keyboard-only journey TEST-REL-04); a pass by a person is still to do (section 2) |
| NFR-12 Accessibility (WCAG 2.1 AA) | F-10, SYS-06 | 3 | Playwright with axe on every main screen; TEST IDs in the F-10 contract | Planned |
| NFR-13 Responsiveness | F-10, SYS-06 | 3 | Playwright screenshots and layout checks at 390 × 844, 820 × 1180, and 1440 × 900; TEST IDs in the F-10 contract | Planned |
| NFR-14 Performance | F-10 | 3 | A scripted timing run of 50 requests per operation on the deployed service; TEST IDs in the F-10 contract | Planned |
| NFR-15 Operability | SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 pipeline run (smoke test after every deploy) and the Cloud Run revision tag (C-06) | Planned |
| NFR-16 Cost | SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 console screenshots: instance limits, database tier, budget | Planned |

## 2. Coverage gaps

Every requirement has a feature or responsibility and a sprint, so no requirement is unallocated. These are the places where verification is not complete, and the plan for each.

| Requirement | Gap | Plan |
|---|---|---|
| NFR-08, NFR-10, NFR-15, NFR-16 | No automated Sprint 1 test: they can only be checked on a fresh clone or on the deployed service. | Lab 5 checks C-03, C-05, C-06, and the console screenshots, before the Sprint 1 release is accepted. Status stays Planned until then. |
| NFR-11 | The automated part (messages beside fields, `aria-describedby`, status as text) is verified. The keyboard-only journey TEST-REL-04 (Playwright, keyboard events only, no mouse) passes on the five main screens. It is not a pass by a person (RD-7). | One of the members does the pass by hand on the release candidate and records it in the release PR. |
| FR-13 to FR-18, BR-16 to BR-18, NFR-12 to NFR-14 | No AC or TEST yet. | Allocated to F-06 to F-10 in section 1. The contract of each feature is written before its tests and code, at the start of its sprint. |
| Q-05, Q-06, Q-07, Q-08 (SRS section 9) | Open questions that change F-06, F-07, F-09, and F-10. | Q-05 is decided in the F-06 contract and Q-06 in the F-07 contract (Sprint 2), Q-07 in the F-09 contract and Q-08 in F-10 (Sprint 3). BR-17 carries provisional values until Q-06 is closed. |

Self-registration, password recovery, account administration, real payments, attachments, notifications, comments, delegation, single sign-on, and multiple organisations are excluded on purpose (SRS section 3.2), so they have no feature.

## 3. Approved changes

| Date | Requirement(s) | Change | Reason | Approved in (PR) |
|---|---|---|---|---|
| 2026-11-14 | FR-01, BR-09, BR-17 | FR-01: "one generic message" applies to wrong credentials only. BR-09: "neither its requester nor its assigned reviewer", with BR-10 checked first. BR-17: the threshold and status name are given as provisional values. SRS v0.3. | Reviews of PR #22 and PR #23 | #26 |

## 4. Sprint 1 verification results

The table is produced from the test runs, not typed by hand: the AC and TEST IDs come from the five contracts, and the result of each TEST is read from the report of the run below. A TEST's name starts with its ID, so it can be found with `git grep TEST-F04-09`.

| Item | Value |
|---|---|
| Code commit tested | `7f8cf54` (commits after it change only documents) |
| Server: unit, API with a real database, process | `cd server && npm test`: 14 files, **131 passed, 0 failed, 0 skipped** |
| Client: component | `cd client && npm test`: 8 files, **36 passed, 0 failed, 0 skipped** |
| End-to-end: Playwright on Chromium | `cd client && npm run e2e`: **8 passed, 0 failed, 0 skipped, 0 flaky** (4 are AC tests, 4 are the release journeys below) |
| Automated vs manual | 107 of the 108 ACs are checked by automated tests (all pass). 1 AC is manual: AC-F05-13 (TEST-F05-13, the static check of environment variables), it was run on this commit and found every variable the code reads (`DATABASE_URL`, `DEMO_USER_PASSWORD`, `NODE_ENV`, `PORT`, `CLIENT_ORIGINS`, `API_PROXY_TARGET`, `CI`, and the Docker Compose `POSTGRES_*` ones) in an `.env.example` file and in `docs/labs/lab-05/deployment.md`; `API_PROXY_TARGET` and `CI` are commented lines in `client/.env.example`. The keyboard pass by a person (RD-7) is separate and still to do; the keyboard-only journey TEST-REL-04 passed. |
| Not yet verified | NFR-08, NFR-10, NFR-15, NFR-16 (Lab 5), and the later-sprint requirements (section 2). |

"Cases" is the number of test cases (`it` and `it.each` rows) that carry the TEST ID. The "Actual test name" column shows the first of them.

| AC | Planned TEST | Level | Actual test file | Actual test name | Cases | Result |
|---|---|---|---|---|---|---|
| AC-F01-01 | TEST-F01-01 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-01 / AC-F01-01: a requester signs in and gets a hashed, expiring session | 2 | pass |
| AC-F01-02 | TEST-F01-02 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-02 / AC-F01-02: the email is trimmed and case-insensitive | 1 | pass |
| AC-F01-03 | TEST-F01-03 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-03 / AC-F01-03: a wrong password is refused with one message and no session | 1 | pass |
| AC-F01-04 | TEST-F01-04 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-04 / AC-F01-04: an unknown email gets exactly the same answer as a wrong password | 1 | pass |
| AC-F01-05 | TEST-F01-05 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-05 / AC-F01-05: invalid bodies are 400, and are not counted by the throttle | 1 | pass |
| AC-F01-06 | TEST-F01-06 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-06 / AC-F01-06: an inactive account gets 403 for the right password and 401 for a wrong one | 1 | pass |
| AC-F01-07 | TEST-F01-07 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-07 / AC-F01-07: after five wrong passwords the sixth attempt is 429, and other accounts are unaffe... | 1 | pass |
| AC-F01-08 | TEST-F01-08 | unit | `server/tests/sprint-1/login-throttle.test.ts` | TEST-F01-08 / AC-F01-08 (a): the oldest failure leaves the window at exactly 15 minutes | 3 | pass |
| AC-F01-09 | TEST-F01-09 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-09 / AC-F01-09: /me returns the signed-in user, and 401 without a valid session | 1 | pass |
| AC-F01-10 | TEST-F01-10 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-10 / AC-F01-10: an expired session answers 401 and its row is deleted | 1 | pass |
| AC-F01-11 | TEST-F01-11 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-11 / AC-F01-11: a session of a user who became inactive answers 401 | 1 | pass |
| AC-F01-12 | TEST-F01-12 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-12 / AC-F01-12: logout deletes the session, clears the cookie, and the old cookie is refused | 1 | pass |
| AC-F01-13 | TEST-F01-13 | API | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-13 / AC-F01-13: logout without a session is 204 | 1 | pass |
| AC-F01-14 | TEST-F01-14 | component | `client/tests/sprint-1/Login.test.tsx` | TEST-F01-14 / AC-F01-14: a requester lands on their home screen, and the header shows who they are | 2 | pass |
| AC-F01-15 | TEST-F01-15 | component | `client/tests/sprint-1/Login.test.tsx` | TEST-F01-15 / AC-F01-15 (a): blank fields show both messages beneath their fields and send nothing | 3 | pass |
| AC-F01-16 | TEST-F01-16 | component | `client/tests/sprint-1/Login.test.tsx` | TEST-F01-16 / AC-F01-16: a throttled sign-in and an inactive account have their own messages | 1 | pass |
| AC-F01-17 | TEST-F01-17 | e2e | `client/e2e/sprint-1/auth.spec.ts` | TEST-F01-17 / AC-F01-17: a signed-in user stays signed in after a reload | 1 | pass |
| AC-F01-18 | TEST-F01-18 | e2e | `client/e2e/sprint-1/auth.spec.ts` | TEST-F01-18 / AC-F01-18: after logging out, Login is shown, also for a direct visit to /requests | 1 | pass |
| AC-F01-19 | TEST-F01-19 | component | `client/tests/sprint-1/AuthFlow.test.tsx` | TEST-F01-19 / AC-F01-19: a 401 sends the user to Login with an explanation | 1 | pass |
| AC-F01-20 | TEST-F01-20 | API-DB (concurrency) | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-20 / AC-F01-20: twenty simultaneous wrong passwords give five 401 and fifteen 429 | 1 | pass |
| AC-F01-21 | TEST-F01-21 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-21 / AC-F01-21: signing out in one browser leaves the other browser's session working | 1 | pass |
| AC-F02-01 | TEST-F02-01 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-01 / AC-F02-01: get /api/auth/me without a session is 401 with no data | 7 | pass |
| AC-F02-02 | TEST-F02-02 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-02 / AC-F02-02: public and optional routes never answer 401 or 403 | 1 | pass |
| AC-F02-03 | TEST-F02-03 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-03 / AC-F02-03: a requester cannot use review operations, even with a malformed body | 1 | pass |
| AC-F02-04 | TEST-F02-04 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-04 / AC-F02-04: every role a route allows gets past the policy checks | 1 | pass |
| AC-F02-05 | TEST-F02-05 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-05 / AC-F02-05: unlisted routes are 404 for the anonymous | 2 | pass |
| AC-F02-06 | TEST-F02-06 | unit | `server/tests/sprint-1/route-policies.test.ts` | TEST-F02-06 / AC-F02-06: every registered route has exactly one policy | 1 | pass |
| AC-F02-07 | TEST-F02-07 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-07 / AC-F02-07: identity headers sent by a client are ignored | 1 | pass |
| AC-F02-08 | TEST-F02-08 | API-DB | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-08 / AC-F02-08: a foreign Origin is refused before sign-in and never counted by the throttle | 1 | pass |
| AC-F02-09 | TEST-F02-09 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-09 / AC-F02-09: the origin guard comes before the session check, which comes before the role check | 1 | pass |
| AC-F02-10 | TEST-F02-10 | API | `server/tests/sprint-1/errors.api.test.ts` | TEST-F02-10 / AC-F02-10: a database error is a fixed 500, and a malformed body is a fixed 400 | 1 | pass |
| AC-F02-11 | TEST-F02-11 | component | `client/tests/sprint-1/Navigation.test.tsx` | TEST-F02-11 / AC-F02-11: a requester sees two links, a reviewer sees three | 1 | pass |
| AC-F02-12 | TEST-F02-12 | component | `client/tests/sprint-1/Navigation.test.tsx` | TEST-F02-12 / AC-F02-12: a requester opening /reviews sees a message and no API call is made | 2 | pass |
| AC-F02-13 | TEST-F02-13 | API | `server/tests/sprint-1/errors.api.test.ts` | TEST-F02-13 / AC-F02-13: health and readiness never look up a session | 1 | pass |
| AC-F02-14 | TEST-F02-14 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-14 / AC-F02-14: the path variant get //api/reviews/inbox is not a route | 5 | pass |
| AC-F02-15 | TEST-F02-15 | API | `server/tests/sprint-1/errors.api.test.ts` | TEST-F02-15 / AC-F02-15: bodies of 102,400 bytes pass the size check, and 102,401 bytes are 413 | 1 | pass |
| AC-F03-01 | TEST-F03-01 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-01 / AC-F03-01: a valid request is stored as SUBMITTED with one history entry | 1 | pass |
| AC-F03-02 | TEST-F03-02 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-02 / AC-F03-02: a reviewer can submit a request to another reviewer | 1 | pass |
| AC-F03-03 | TEST-F03-03 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-03 / AC-F03-03: identity and status fields sent by the client are ignored | 1 | pass |
| AC-F03-04 | TEST-F03-04 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-04 / AC-F03-04: request numbers are unique and increasing | 1 | pass |
| AC-F03-05 | TEST-F03-05 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-05 / AC-F03-05: the amount is a string from 0.01 to 1,000,000.00 with at most two decimals | 1 | pass |
| AC-F03-06 | TEST-F03-06 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-06 / AC-F03-06: title and description lengths are checked after trimming | 1 | pass |
| AC-F03-07 | TEST-F03-07 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-07 / AC-F03-07: the reviewer must be an active reviewer | 1 | pass |
| AC-F03-08 | TEST-F03-08 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-08 / AC-F03-08: nobody can be the reviewer of their own request | 1 | pass |
| AC-F03-09 | TEST-F03-09 | DB integration | `server/tests/sprint-1/request-constraints.db.test.ts` | TEST-F03-09 (control): a valid row is accepted | 6 | pass |
| AC-F03-10 | TEST-F03-10 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-10 / AC-F03-10: the reviewer list has active reviewers only, without the caller, sorted by name | 1 | pass |
| AC-F03-11 | TEST-F03-11 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-11 / AC-F03-11: my requests are only the ones I submitted, newest first | 1 | pass |
| AC-F03-12 | TEST-F03-12 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-12 / AC-F03-12: the requester and the assigned reviewer can open a request with its history | 1 | pass |
| AC-F03-13 | TEST-F03-13 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-13 / AC-F03-13: anyone else gets the same 404 as for a request that does not exist | 1 | pass |
| AC-F03-14 | TEST-F03-14 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-14 / AC-F03-14: delete on a request is not a route | 3 | pass |
| AC-F03-15 | TEST-F03-15 | component | `client/tests/sprint-1/NewRequest.test.tsx` | TEST-F03-15 / AC-F03-15: a valid form is posted with the amount as a string, then the new request opens | 1 | pass |
| AC-F03-16 | TEST-F03-16 | component | `client/tests/sprint-1/NewRequest.test.tsx` | TEST-F03-16 / AC-F03-16 (a): a blank form shows four messages beneath their fields and sends nothing | 4 | pass |
| AC-F03-17 | TEST-F03-17 | component | `client/tests/sprint-1/NewRequest.test.tsx` | TEST-F03-17 / AC-F03-17: with no reviewers the form says so and cannot be submitted | 1 | pass |
| AC-F03-18 | TEST-F03-18 | component | `client/tests/sprint-1/MyRequests.test.tsx` | TEST-F03-18 / AC-F03-18: an error shows Try again, which loads the list again | 3 | pass |
| AC-F03-19 | TEST-F03-19 | component | `client/tests/sprint-1/RequestDetail.test.tsx` | TEST-F03-19 / AC-F03-19: a request shows its fields, status, and history | 2 | pass |
| AC-F03-20 | TEST-F03-20 | e2e | `client/e2e/sprint-1/requests.spec.ts` | TEST-F03-20 / AC-F03-20: a submitted request is listed as SUBMITTED, before and after a reload | 1 | pass |
| AC-F03-21 | TEST-F03-21 | API-DB + component | `client/tests/sprint-1/MyRequests.test.tsx` | TEST-F03-21 / AC-F03-21: markup in a title is shown as text, not turned into elements | 3 | pass |
| AC-F04-01 | TEST-F04-01 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-01 / AC-F04-01: the inbox lists only my SUBMITTED requests, oldest first | 1 | pass |
| AC-F04-02 | TEST-F04-02 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-02 / AC-F04-02: with nothing assigned the inbox is an empty list | 1 | pass |
| AC-F04-03 | TEST-F04-03 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-03 / AC-F04-03: approving without a reason records the decision and one history entry | 1 | pass |
| AC-F04-04 | TEST-F04-04 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-04 / AC-F04-04: an approval reason is trimmed and stored on the request and the event | 1 | pass |
| AC-F04-05 | TEST-F04-05 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-05 / AC-F04-05: rejecting with a reason stores it on the request and the event | 1 | pass |
| AC-F04-06 | TEST-F04-06 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-06 / AC-F04-06: a rejection needs a reason of 1 to 1000 characters | 1 | pass |
| AC-F04-07 | TEST-F04-07 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-07 / AC-F04-07: a lower-case decision is refused | 4 | pass |
| AC-F04-08 | TEST-F04-08 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-08 / AC-F04-08: a reviewer cannot decide a request they submitted, whatever the body | 1 | pass |
| AC-F04-09 | TEST-F04-09 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-09 / AC-F04-09: a reviewer the request is not assigned to gets the same 404 as for a missing request | 1 | pass |
| AC-F04-10 | TEST-F04-10 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-10 / AC-F04-10: a requester cannot decide, not even their own request | 1 | pass |
| AC-F04-11 | TEST-F04-11 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-11 / AC-F04-11: a decided request cannot be decided again | 1 | pass |
| AC-F04-12 | TEST-F04-12 | API-DB (concurrency) | `server/tests/sprint-1/decision-concurrency.api.test.ts` | TEST-F04-12 / AC-F04-12: an approve and a reject sent together give exactly one 200 and one 409, twenty times | 1 | pass |
| AC-F04-13 | TEST-F04-13 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-13 / AC-F04-13: the requester sees the decision, the reason, and the history | 1 | pass |
| AC-F04-14 | TEST-F04-14 | DB integration | `server/tests/sprint-1/request-constraints.db.test.ts` | TEST-F04-14 (controls): a valid submitted row, a valid rejected row, and a history row are accepted | 10 | pass |
| AC-F04-15 | TEST-F04-15 | component | `client/tests/sprint-1/ReviewInbox.test.tsx` | TEST-F04-15 / AC-F04-15: a row opens the request | 4 | pass |
| AC-F04-16 | TEST-F04-16 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-16 / AC-F04-16: nobody sees it once the request is decided | 3 | pass |
| AC-F04-17 | TEST-F04-17 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-17 / AC-F04-17 (a): Reject with a blank reason shows a message beneath the field and sends nothing | 3 | pass |
| AC-F04-18 | TEST-F04-18 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-18 / AC-F04-18: a rejection sends its reason | 2 | pass |
| AC-F04-19 | TEST-F04-19 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-19 / AC-F04-19: a 409 says so, loads the request again, and the panel is gone | 1 | pass |
| AC-F04-20 | TEST-F04-20 | e2e | `client/e2e/sprint-1/reviews.spec.ts` | TEST-F04-20 / AC-F04-20: Mint approves a request from the inbox, and it is gone from the inbox after a reload | 1 | pass |
| AC-F04-21 | TEST-F04-21 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-21 / AC-F04-21: a reason that is not a string is refused | 1 | pass |
| AC-F04-22 | TEST-F04-22 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-22 / AC-F04-22: spaces around a 1000-character reason are not counted or stored | 1 | pass |
| AC-F04-23 | TEST-F04-23 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-23 / AC-F04-23: a request I submitted is not in my inbox, but is in its reviewer's | 1 | pass |
| AC-F05-01 | TEST-F05-01 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-01 / AC-F05-01: migrate deploy then seed create the four demo accounts | 1 | pass |
| AC-F05-02 | TEST-F05-02 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-02 / AC-F05-02: running the seed again changes nothing | 1 | pass |
| AC-F05-03 | TEST-F05-03 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-03 / AC-F05-03: a new DEMO_USER_PASSWORD replaces every hash | 1 | pass |
| AC-F05-04 | TEST-F05-04 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-04 / AC-F05-04: without DEMO_USER_PASSWORD the seed exits 1 and creates nothing | 1 | pass |
| AC-F05-05 | TEST-F05-05 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-05 / AC-F05-05: a password with 9 characters is refused without being printed | 2 | pass |
| AC-F05-06 | TEST-F05-06 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-06 / AC-F05-06: no seed run prints the password or a hash | 1 | pass |
| AC-F05-07 | TEST-F05-07 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-07 / AC-F05-07: every stored password_hash is an scrypt hash, not the password | 1 | pass |
| AC-F05-08 | TEST-F05-08 | API | `server/tests/sprint-1/health.api.test.ts` | TEST-F05-08 / AC-F05-08: GET /api/health answers 200 ok, with no cookie | 1 | pass |
| AC-F05-09 | TEST-F05-09 | API | `server/tests/sprint-1/health.api.test.ts` | TEST-F05-09 / AC-F05-09: GET /api/ready answers 200 ready when the database is reachable | 1 | pass |
| AC-F05-10 | TEST-F05-10 | API | `server/tests/sprint-1/health.api.test.ts` | TEST-F05-10 / AC-F05-10: GET /api/ready answers 503 not_ready, with no error detail, when the database fails | 1 | pass |
| AC-F05-11 | TEST-F05-11 | integration (process) | `server/tests/sprint-1/config.process.test.ts` | TEST-F05-11 / AC-F05-11: a broken production configuration exits with code 1 and never listens | 1 | pass |
| AC-F05-12 | TEST-F05-12 | integration (process) | `server/tests/sprint-1/config.process.test.ts` | TEST-F05-12 / AC-F05-12: PORT=4123 with a valid configuration serves /api/health on that port | 1 | pass |
| AC-F05-13 | TEST-F05-13 | manual (static check) | `-` | Recorded in the #8 PR and in Part F | - | manual (see note) |
| AC-F05-14 | TEST-F05-14 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-14 / AC-F05-14: DATABASE_URL unset throws, NODE_ENV=development | 2 | pass |
| AC-F05-15 | TEST-F05-15 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-15 / AC-F05-15: PORT unset gives 3000 and 4123 gives 4123 | 8 | pass |
| AC-F05-16 | TEST-F05-16 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-16 / AC-F05-16: NODE_ENV=staging is refused without echoing it; unset gives development | 1 | pass |
| AC-F05-17 | TEST-F05-17 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-17 / AC-F05-17: CLIENT_ORIGINS defaults outside production, and entries are trimmed | 1 | pass |
| AC-F05-18 | TEST-F05-18 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-18 / AC-F05-18: production (a) only CLIENT_ORIGINS missing names CLIENT_ORIGINS and not DATABASE_URL | 3 | pass |
| AC-F05-19 | TEST-F05-19 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-19 / AC-F05-19: a changed name and role are restored by one update | 1 | pass |
| AC-F05-20 | TEST-F05-20 | integration (process) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-20 / AC-F05-20: without DATABASE_URL the seed exits 1 within 15 s | 1 | pass |
| AC-F05-21 | TEST-F05-21 | integration (process) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-21 / AC-F05-21: the placeholder password in server/.env.example is refused | 1 | pass |
| AC-F05-22 | TEST-F05-22 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-22 / AC-F05-22: CLIENT_DIST_DIR is null when unset or blank, and trimmed when set | 1 | pass |
| AC-F05-23 | TEST-F05-23 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-23 / AC-F05-23: the page, a deep link, and a file are served to anyone | 1 | pass |
| AC-F05-24 | TEST-F05-24 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-24 / AC-F05-24: the API is unchanged while the UI is served | 1 | pass |
| AC-F05-25 | TEST-F05-25 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-25 / AC-F05-25: nothing outside the directory is served | 1 | pass |
| AC-F05-26 | TEST-F05-26 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-26 / AC-F05-26: without CLIENT_DIST_DIR the UI is not served | 1 | pass |
| AC-F05-27 | TEST-F05-27 | unit | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-27 / AC-F05-27: a directory without index.html is refused when the app is created | 1 | pass |
| AC-F05-28 | TEST-F05-28 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-28 / AC-F05-28: a missing file with an extension is a 404, not the page, and deep links still work | 1 | pass |

### Release verification journeys (not AC tests)

These four end-to-end journeys (Issue #12, defined in `docs/sprints/sprint-1/README.md`) check the integrated increment. They pass when first written, so they are not red evidence.

| TEST | Journey | File | Result |
|---|---|---|---|
| TEST-REL-01 | happy path, from submission to the approved request seen by its requester | `client/e2e/sprint-1/journeys.spec.ts` | pass |
| TEST-REL-02 | business rules block a bad request and an undecided rejection, and change nothing | `client/e2e/sprint-1/journeys.spec.ts` | pass |
| TEST-REL-03 | a requester cannot reach or use reviewer operations, and an unrelated reviewer sees nothing | `client/e2e/sprint-1/journeys.spec.ts` | pass |
| TEST-REL-04 | every action on the five main screens can be done with the keyboard alone | `client/e2e/sprint-1/keyboard.spec.ts` | pass |
