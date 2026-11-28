# F-09: Decision summaries and reports (engineering contract)

> **Project Deliverable 2, Part C** (a Sprint 3 feature, specified in Sprint 2). Write and commit this contract
> (`docs(F-09): ...`) **before** any test or implementation commit for this feature. Revisions stay visible: add a
> version-history row for every change. Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-09 |
| Sprint | 3 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-18; BR-08, BR-18; NFR-01, NFR-02, NFR-06, NFR-11 |
| GitHub Issue | #84 |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-04 (decisions), F-07 (the five statuses and two approvals), F-08 (the date filters and their messages) |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-28 | Menelaus122 | First complete draft; proposes the answer to Q-07 | Issue #84 | |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

A signed-in user sees how the requests they may access stand for a chosen period (FR-18):

- for each status, the **number of requests** and their **total amount**, and the totals over all statuses;
- for a reviewer, also **how many they approved and how many they rejected** in that period.

The period is given by two optional dates. Without dates it covers everything.

**Which requests are counted** (BR-18): exactly those that Request Detail would show the caller (BR-08):

| Caller | Requests counted |
|---|---|
| Requester | Their own |
| Reviewer | Their own; those assigned to them; those waiting for a second approval; those on which they gave the second decision |

A request belongs to the period by the day of `createdAt`, its first submission, as in F-08.

**Own decisions** are counted from the history: the `APPROVED`, `FIRST_APPROVED`, and `REJECTED` entries whose actor
is the caller and whose own day is in the period. A first of two approvals counts as an approval. A return is not a
decision. This count follows the day of the decision, not of the submission.

**Q-07, proposed:** no export. The summary is read on the screen; a file download is not part of the product (D-16).

### 1.2 Workflow and state transitions

No change: the summary only reads.

### 1.3 Business rules enforced

| BR | How it is enforced (layer) |
|---|---|
| BR-08, BR-18: only visible requests | One scope function, shared with Request Detail, limits the query to the session user; no parameter names a user (server) |
| BR-18 for own decisions | History entries whose actor is the session user (server) |

### 1.4 Validation (query parameters)

| Parameter | Rule | Error, `400 VALIDATION_ERROR` in `fields` |
|---|---|---|
| `from`, `to` | Optional. A real calendar date `YYYY-MM-DD`, an Asia/Bangkok day, both included | "Enter a date as YYYY-MM-DD." and, for `to` before `from`, `fields.to` "The end date is before the start date." |
| Either given not as one text value | Refused | "Give this filter once." |

A blank value is ignored, and so is any other parameter. Every problem is reported at once.

### 1.5 Failure and boundary cases

- **A period without requests:** `200`; every count `0` and every amount `"0.00"`.
- **Money:** amounts are added as decimals in the database and returned as strings with two decimals.
- **Day boundaries:** as F-08 §1.5.
- **Consistency:** the counts of one answer are read in one transaction.
- **A reviewer's counts change** when another reviewer decides a waiting request, because it then leaves their scope.
- **Known limitations:** no export, no chart, and no breakdown by person or by rejection category.

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| Read the summary | ✅ | ✅ | ❌ 401 | As §1.1 |

### 1.7 Dependencies

- **F-02:** one policy row (`GET /api/reports/summary`, both roles) and a navigation link; `AC-F02-11` is revised.
- **F-03, F-07:** the visibility rule of Request Detail moves into the shared scope function without changing it.
- **F-08:** the same date rules and messages.
- **F-10:** the screen is part of its accessibility and layout checks.

## 2. Layer specifications

### 2.1 UI

| Screen / element | Behaviour |
|---|---|
| Navigation | "Summary" for both roles, at `/summary` |
| Period | "From" and "To" (`YYYY-MM-DD`), **Apply** and **Clear**; the values are kept in the address; checks and messages as F-08 §2.1 |
| By status | A table "Status", "Requests", "Total amount (THB)": one row for each of the five statuses in the order Submitted, Awaiting second approval, Returned, Approved, Rejected, then a row "Total" |
| Your decisions | Reviewer only: "Approved: n" and "Rejected: n" under the heading "Your decisions in this period" |
| States | Loading; "No requests in this period." above the table of zeros; an error with **Try again** |

### 2.2 API

| Method | Path | Auth / role | Request (query) | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/reports/summary` | both roles | §1.4 | `200`, below | `400 VALIDATION_ERROR`, `401` |

```json
GET /api/reports/summary?from=2026-11-01&to=2026-11-30

200
{ "period": { "from": "2026-11-01", "to": "2026-11-30" },
  "byStatus": [
    { "status": "SUBMITTED", "count": 2, "totalAmount": "18600.00" },
    { "status": "AWAITING_SECOND_APPROVAL", "count": 0, "totalAmount": "0.00" },
    { "status": "RETURNED", "count": 0, "totalAmount": "0.00" },
    { "status": "APPROVED", "count": 1, "totalAmount": "250000.00" },
    { "status": "REJECTED", "count": 0, "totalAmount": "0.00" } ],
  "total": { "count": 3, "totalAmount": "268600.00" },
  "myDecisions": { "approved": 1, "rejected": 0 } }
```

`myDecisions` is `null` for a requester.

### 2.3 Data

No column changes. An additive index on `request_event(actor_id, created_at)` for the decision counts; F-08 slice 2
uses the same index, and whichever comes first adds it.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F09-01 | Ploy has requests in each status | She asks for the summary | Each status shows its count and total, and "total" their sums | normal | FR-18 |
| AC-F09-02 | Amounts 0.01, 0.02, and 999,999.99 | She asks | The total is exactly "1000000.02", as a string | boundary | FR-18 |
| AC-F09-03 | Requests on both sides of both midnights of a period | She gives `from` and `to` | Only those submitted in the Bangkok days of the period | boundary | FR-18 |
| AC-F09-04 | Requests of Ploy and of Nattapong | Each asks, also with a user id in the query | Each sees only their own numbers | role | BR-08, BR-18, NFR-02 |
| AC-F09-05 | Requests of every relation to Mint, and one of another reviewer's that Mint has no part in | Mint asks | Her own, her assigned ones, the waiting ones, and her second decisions are counted; the other is not | role | BR-08, BR-18 |
| AC-F09-06 | Mint approved, gave a first approval, rejected, and returned requests, some outside the period; Korn decided others | Mint asks for the period | "approved" counts both kinds of approval and "rejected" the rejections, by the decision day; no return, nothing of Korn's | boundary | FR-18, BR-18 |
| AC-F09-07 | | Invalid dates, an end before the start, and a date given twice | `400` with the exact `fields` | negative | FR-18, NFR-06 |
| AC-F09-08 | | No session asks | `401` with no data | role | NFR-01 |
| AC-F09-09 | A period without requests | A user asks | `200`; five rows of zero; `myDecisions` zero for a reviewer and `null` for a requester | boundary | FR-18 |
| AC-F09-10 | The Summary screen | A user applies a period, reloads, and clears it | The address and the table follow; an empty period says "No requests in this period." | normal | FR-18 |
| AC-F09-11 | The Summary screen | Invalid dates; the API fails | Messages beside the fields with focus and nothing sent; an error with **Try again** | negative | FR-18, NFR-11 |
| AC-F09-12 | A requester and a reviewer signed in | They look at the navigation and the screen | "Summary" for both; "Your decisions in this period" for the reviewer only | role | FR-18, NFR-11 |
| AC-F09-13 | The running stack | Ploy submits, Mint approves, Mint opens Summary | The numbers include the approval, also after a reload | normal | FR-18 |

## 4. Software Test Specification (STS)

Server files are in `server/tests/sprint-3/`, client files in `client/tests/sprint-3/` and `client/e2e/sprint-3/`.
Each test makes its own users and requests.

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-F09-01 | AC-F09-01 | API-DB | Requests in each status | Call | As the AC | `summary.api.test.ts` |
| TEST-F09-02 | AC-F09-02 | API-DB | The three amounts | Call | As the AC | `summary.api.test.ts` |
| TEST-F09-03 | AC-F09-03 | API-DB | `created_at` set around 17:00 UTC | One period | As the AC | `summary.api.test.ts` |
| TEST-F09-04 | AC-F09-04 | API-DB | Two requesters | Calls | As the AC | `summary-access.api.test.ts` |
| TEST-F09-05 | AC-F09-05 | API-DB | The relations of §1.1 | Call | As the AC | `summary-access.api.test.ts` |
| TEST-F09-06 | AC-F09-06 | API-DB | History entries inside and outside the period | Call | As the AC | `summary.api.test.ts` |
| TEST-F09-07 | AC-F09-07 | API-DB | Table of invalid queries | Call | `400`, exact `fields` | `summary-access.api.test.ts` |
| TEST-F09-08 | AC-F09-08 | API-DB | | No session | `401` | `summary-access.api.test.ts` |
| TEST-F09-09 | AC-F09-09 | API-DB | Empty period | Both roles | As the AC | `summary.api.test.ts` |
| TEST-F09-10 | AC-F09-10 | component | Mocked API | Apply, reload, clear | As the AC | `Summary.test.tsx` |
| TEST-F09-11 | AC-F09-11 | component | Mocked API | Invalid values; mocked `500` | As the AC | `Summary.test.tsx` |
| TEST-F09-12 | AC-F09-12 | component | Mocked sessions | Navigation and screen | As the AC | `Summary.test.tsx` |
| TEST-F09-13 | AC-F09-13 | e2e | Running stack | The journey | As the AC | `summary.spec.ts` |

**Coverage check:** every AC above maps to one TEST with the same number.

**Earlier tests that must change.** `TEST-F02-11` and the policy-table tests of F-02 gain the new link and route. No
assertion is removed or loosened.

## 5. Definition of Done (feature)

The [Product Definition of Done](../sprint-1/README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test
- [ ] TDD evidence: a failing test commit, then a passing implementation commit
- [ ] The whole earlier regression passes on the same commit

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | |
