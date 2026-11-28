# F-08: Filtering, search, and decided requests (engineering contract)

> **Project Deliverable 2, Part C** (a Sprint 3 feature, specified and started in Sprint 2). Write and commit this
> contract (`docs(F-08): ...`) **before** any test or implementation commit for this feature. Revisions stay visible:
> add a version-history row for every change. Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-08 |
| Sprint | 3 (slice 1 delivered for Deliverable 2) |
| Status | Agreed at v0.2; slice 1 implemented (not yet reviewed); slices 2 and 3 not implemented (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-16, FR-17; FR-05, FR-07; BR-08, BR-18; NFR-02, NFR-06, NFR-11 |
| GitHub Issue | #79 |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-03 (My Requests), F-04 (Review Inbox and decisions), F-06 and F-07 (the five statuses, and the inbox as F-07 changed it) |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-28 | Menelaus122 | First complete draft | Issue #79 | |
| 0.2 | 2026-11-28 | Menelaus122 | AC-F08-08 adds requests that match the filters but are not in the inbox, and a status the inbox never holds; §1.3 keeps the scope and the search apart. §1.4 says that `from` and `to` compare the day of the first submission, and that a filter written as a list or an object is refused (AC-F08-09). AC-F08-03 covers both midnights. | Review of PR #80, points 1 to 5; agreed with these changes | #80 |
| 0.3 | 2026-11-28 | Menelaus122 | Slice 1 is implemented: status, section 6, and section 7 filled in; two further cases under TEST-F08-10. No change to any AC or behaviour. | Evidence of the implementation | #80 |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and slices

The lists of Sprint 1 show everything, which stops being usable as requests accumulate. F-08 is delivered in three
slices, each usable on its own.

| Slice | Content | Delivered |
|---|---|---|
| 1 | Filtering and search on **My Requests** and the **Review Inbox** (FR-16) | Deliverable 2 |
| 2 | The reviewer's list of **decided requests**, with the same filters (FR-17) | Sprint 3 |
| 3 | **Paging** of the three lists (A-04) | Sprint 3 |

### 1.2 Behaviour

- Filters are applied by the server, to the list the caller may already see (BR-18). They only make a list smaller.
- All given filters must match (they are combined with "and").
- The order of each list does not change: My Requests newest first, Review Inbox oldest first, decided requests newest
  decision first.
- The screens keep the filters in the address, so a reload or a copied link shows the same list.
- **Decided requests** are those on which the caller recorded an approval or a rejection, including a first of two
  approvals (F-07). Returning a request is not a decision. A request appears once, with the caller's latest such
  decision.

### 1.3 Business rules enforced

| BR | How it is enforced (layer) |
|---|---|
| BR-08, BR-18: only visible requests | Every filter is added to the query that is already scoped to the session user; no parameter names a user (server). The scope and each filter are separate conditions that must all hold: the alternatives inside the search (number or title) never replace those inside the inbox scope |
| BR-18 for decided requests | The list is built from history entries whose actor is the session user (server) |

### 1.4 Validation (query parameters)

All parameters are optional. An empty or blank value is ignored, and so is a parameter that the contract does not name.

| Parameter | Rule | Error, `400 VALIDATION_ERROR` in `fields` |
|---|---|---|
| `q` | Trimmed, at most 120 characters (code points). Matches any part of the request number or the title, ignoring case; `%`, `_`, and `\` match themselves | "Search text must be 120 characters or fewer." |
| `status` | One request status | "Choose a status from the list." |
| `from`, `to` | A real calendar date `YYYY-MM-DD`, compared with the day of `createdAt`: the first submission, shown as "Submitted", which a resubmission does not change. The days are those of Asia/Bangkok, and both are included | "Enter a date as YYYY-MM-DD." and, for `to` before `from`, `fields.to` "The end date is before the start date." |
| `minAmount`, `maxAmount` | The amount format of F-03 §1.4 without its range (0 is allowed); both limits are included | "Enter the amount as a number, for example 1250.50." and, for a maximum below the minimum, `fields.maxAmount` "The maximum is below the minimum." |
| Any of the above that is not one text value: given twice, or written as a list or an object (`status[]=APPROVED`, `q[a]=x`) | Refused, never a server error | "Give this filter once." |
| `page` (slice 3) | A whole number from 1; default 1 | "Page must be 1 or more." |
| `pageSize` (slice 3) | A whole number from 1 to 100; default 20 | "Page size must be between 1 and 100." |

Every problem is reported at once.

### 1.5 Failure and boundary cases

- **Day boundaries:** a request submitted at 23:59:59 in Bangkok belongs to that day, and one at 00:00:00 to the next,
  whatever its date in UTC.
- **No match:** `200` with an empty list.
- **A status that a list never holds** (for example `APPROVED` in the inbox): an empty list, not an error.
- **A page after the last one** (slice 3): `200`, an empty list, and the real `total`.
- **Searching for another person's request** by its exact number or title returns nothing, the same as a number that
  does not exist.
- **Known limitation:** the search looks at the number and the title only, not the description.

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| Filter My Requests | ✅ | ✅ | ❌ 401 | Requester = caller |
| Filter the Review Inbox | ❌ 403 | ✅ | ❌ 401 | As the inbox (F-04, F-07) |
| List and filter decided requests (slice 2) | ❌ 403 | ✅ | ❌ 401 | Decisions recorded by the caller |

### 1.7 Dependencies

- **F-02:** one new policy row in slice 2 (`GET /api/reviews/decided`, `REVIEWER`).
- **F-03, F-04:** their list routes accept the parameters; without any, they answer as before until slice 3.
- **F-09** uses the same scope for its summaries. **F-10** measures NFR-14 on the paged lists.

## 2. Layer specifications

### 2.1 UI

| Screen / element | Behaviour |
|---|---|
| Filter bar (My Requests, Review Inbox, decided requests) | Above the list: "Search number or title", "Status" (first choice "All"), "Submitted from", "Submitted to", "Minimum amount (THB)", "Maximum amount (THB)", the buttons **Apply filters** and **Clear filters**. Enter applies. The status field of My Requests and of decided requests offers every status; that of the inbox offers the two it holds, "Submitted" and "Awaiting second approval" |
| Applying | The values go into the address and the list is loaded with them; the fields show the values of the address after a reload |
| Clearing | The address loses the filters and the full list is shown |
| Validation | The checks and messages of §1.4 beside the fields, linked with `aria-describedby`; focus moves to the first invalid field; nothing is sent. The API's `fields` messages are shown the same way |
| No match | "No requests match these filters." The empty messages of F-03 and F-04 stay for a list without filters |
| Decided requests (slice 2) | A screen "Decided" at `/reviews/decided`, in the reviewer's navigation: number, title, requester, amount, current status, "Your decision", and its date |
| Pager (slice 3) | "Previous" and "Next", "Page n of m", disabled at the ends; the page is in the address; applying filters returns to page 1 |

### 2.2 API

| Method | Path | Auth / role | Request (query) | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/requests/mine` | as F-03 | §1.4 | As F-03 | `400 VALIDATION_ERROR`, `401` |
| `GET` | `/api/reviews/inbox` | as F-04 | §1.4 | As F-04 | `400`, `401`, `403` |
| `GET` | `/api/reviews/decided` (slice 2) | `REVIEWER` | §1.4 | `200 { "requests": [...] }`, each with `id`, `requestNumber`, `title`, `amount`, `requester`, `status`, `createdAt`, and `myDecision: { "type", "at" }` | `400`, `401`, `403` |
| (slice 3) | all three | | adds `page`, `pageSize` | gains `"total"`, `"page"`, `"pageSize"` | |

```json
GET /api/requests/mine?q=lab&status=APPROVED&from=2026-11-01&to=2026-11-30&minAmount=100

200
{ "requests": [ { "id": 63, "requestNumber": "REQ-000063", "title": "Lab supplies", "amount": "6700.00",
  "status": "APPROVED", "assignedReviewer": { "id": 3, "name": "Mint Chaiyaporn" },
  "createdAt": "2026-11-26T02:10:00.000Z" } ] }
```

### 2.3 Data

Slices 1 and 3: no change. Slice 2 may add an index on `request_event(actor_id)` in an additive migration; no column
changes.

## 3. Acceptance criteria

| AC ID | Slice | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|---|
| AC-F08-01 | 1 | Ploy has a request in each of the five statuses | She asks for each status | Only that status, newest first | normal | FR-16 |
| AC-F08-02 | 1 | Titles that differ in case and contain `%`, `_`, and `\` | Ploy searches part of a number and of a title | The matching requests only; the three characters match themselves | boundary | FR-16 |
| AC-F08-03 | 1 | Requests made just before and just after each of the two midnights that start and end one day in Bangkok | Ploy gives `from` and `to` for that day | Exactly that day's requests | boundary | FR-16 |
| AC-F08-04 | 1 | Amounts 99.99, 100.00, 200.00, and 200.01 | Ploy asks from 100 to 200.00 | 100.00 and 200.00 only | boundary | FR-16 |
| AC-F08-05 | 1 | Several requests | Ploy combines all filters; then a combination that matches nothing | Only requests matching all of them; then `200` with an empty list | normal | FR-16 |
| AC-F08-06 | 1 | Any list | Invalid values of §1.4, several at once | `400` with the exact `fields` | negative | FR-16, NFR-06 |
| AC-F08-07 | 1 | Requests of Ploy and of Nattapong | Nattapong searches Ploy's number and title and adds `requesterId`; no session asks; a requester asks the inbox with filters | Nothing of Ploy's; `401`; `403` | role | BR-08, BR-18, NFR-02 |
| AC-F08-08 | 1 | Mint has submitted requests, requests that wait for her second approval, and decided ones. Matching the same filters, but not in her inbox, are a `SUBMITTED` request assigned to another reviewer, a waiting one that she approved first, and a waiting one that she submitted | She filters her inbox by status, text, dates, and amounts, and asks for `APPROVED` | Only the matching requests of her inbox, oldest first, and none of those three; for `APPROVED` an empty list | role | FR-07, FR-16, BR-18 |
| AC-F08-09 | 1 | Any list | Blank and unknown parameters; a filter given twice, as a list, and as an object | Blank and unknown ones are ignored; each of the others `400` "Give this filter once." | boundary | FR-16 |
| AC-F08-10 | 1 | My Requests | Ploy applies filters, reloads, clears; then filters to nothing | The address and list follow; the fields keep their values; the full list returns; the no-match message | normal | FR-05, FR-16 |
| AC-F08-11 | 1 | The filter bar | Invalid values, and a `400` from the API | Messages beside the fields with focus; nothing sent for the first; the API messages shown | negative | FR-16, NFR-11 |
| AC-F08-12 | 1 | Review Inbox | Mint applies and clears filters | As AC-F08-10; the status field offers "All", "Submitted", and "Awaiting second approval" | normal | FR-07, FR-16 |
| AC-F08-13 | 1 | The running stack | Ploy searches her request by number with the keyboard only | The list shows it alone, also after a reload | normal | FR-16, NFR-11 |
| AC-F08-14 | 2 | Mint has approved and rejected requests; Korn has others; some are undecided or returned | Mint asks for her decided requests | Hers only, newest decision first, with decision and date | normal | FR-17, BR-18 |
| AC-F08-15 | 2 | A first approval by Mint, and a request she returned | She asks | The first approval is listed; the return is not | boundary | FR-17 |
| AC-F08-16 | 2 | Decided requests | Mint filters them | The filters of §1.4 apply | normal | FR-16, FR-17 |
| AC-F08-17 | 2 | | A requester and no session ask | `403`, `401` | role | BR-18, NFR-02 |
| AC-F08-18 | 2 | A reviewer and a requester signed in | They look at the navigation and open the screen | "Decided" for the reviewer only; the requester sees "not available" | role | FR-17, NFR-11 |
| AC-F08-19 | 3 | 45 requests | Pages 1, 3, and 4 of size 20 | 20, 5, and 0 requests; `total` 45; no request twice or missing | boundary | FR-16 |
| AC-F08-20 | 3 | Any list | `page` 0, `pageSize` 101, and a fraction | `400` with the fields | negative | FR-16 |
| AC-F08-21 | 3 | 45 requests, some matching a filter | A page with filters | `total` counts the matching requests | normal | FR-16 |
| AC-F08-22 | 3 | A list of three pages | The pager is used, then a filter is applied | Pages follow the address; the ends disable a button; a filter returns to page 1 | normal | FR-16, NFR-11 |

## 4. Software Test Specification (STS)

Levels as in F-06. Server files are in `server/tests/sprint-3/`, client files in `client/tests/sprint-3/` and
`client/e2e/sprint-3/`. Each test makes its own users and requests.

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-F08-01 | AC-F08-01 | API-DB | Requests in each state | One call per status | As the AC | `filters.api.test.ts` |
| TEST-F08-02 | AC-F08-02 | API-DB | Titles with the special characters | Searches | As the AC | `filters.api.test.ts` |
| TEST-F08-03 | AC-F08-03 | API-DB | `created_at` set on both sides of 17:00 UTC at the start and at the end of the day | One-day range | As the AC | `filters.api.test.ts` |
| TEST-F08-04 | AC-F08-04 | API-DB | The four amounts | Range | As the AC | `filters.api.test.ts` |
| TEST-F08-05 | AC-F08-05 | API-DB | Mixed requests | Combined | As the AC | `filters.api.test.ts` |
| TEST-F08-06 | AC-F08-06 | API-DB | Table of invalid queries | Call | `400`, exact `fields` | `filter-validation.api.test.ts` |
| TEST-F08-07 | AC-F08-07 | API-DB | Two requesters | The calls | As the AC | `filter-access.api.test.ts` |
| TEST-F08-08 | AC-F08-08 | API-DB | Both statuses of the inbox, decided requests, and the three others, all matching the filters | Filter the inbox | As the AC | `filters.api.test.ts` |
| TEST-F08-09 | AC-F08-09 | API-DB | | Blank, unknown, repeated, list, object | As the AC | `filter-validation.api.test.ts` |
| TEST-F08-10 | AC-F08-10 | component | Mocked API | Apply, reload, clear, no match | Calls, address, messages | `MyRequestsFilters.test.tsx` |
| TEST-F08-11 | AC-F08-11 | component | Mocked API | Invalid values; mocked `400` | As the AC | `MyRequestsFilters.test.tsx` |
| TEST-F08-12 | AC-F08-12 | component | Mocked API | Apply, clear | As the AC | `ReviewInboxFilters.test.tsx` |
| TEST-F08-13 | AC-F08-13 | e2e | Running stack, a request made through the API | Keyboard search | As the AC | `search.spec.ts` |
| TEST-F08-14 | AC-F08-14 | API-DB | Two reviewers | Call | As the AC | `decided.api.test.ts` |
| TEST-F08-15 | AC-F08-15 | API-DB | First approval and return | Call | As the AC | `decided.api.test.ts` |
| TEST-F08-16 | AC-F08-16 | API-DB | Decided requests | Filters | As the AC | `decided.api.test.ts` |
| TEST-F08-17 | AC-F08-17 | API-DB | | The two callers | `403`, `401` | `decided.api.test.ts` |
| TEST-F08-18 | AC-F08-18 | component | Mocked sessions | Navigation and screen | As the AC | `Decided.test.tsx` |
| TEST-F08-19 | AC-F08-19 | API-DB | 45 requests | Pages | As the AC | `paging.api.test.ts` |
| TEST-F08-20 | AC-F08-20 | API-DB | | Invalid values | `400` | `paging.api.test.ts` |
| TEST-F08-21 | AC-F08-21 | API-DB | 45 requests | Filtered page | As the AC | `paging.api.test.ts` |
| TEST-F08-22 | AC-F08-22 | component | Mocked API | Use the pager | As the AC | `Pager.test.tsx` |

**Coverage check:** every AC above maps to one TEST with the same number.

**Earlier tests that must change.** Slice 1: none; a list without parameters answers as before. Slice 2: a reviewer
gets a fourth navigation link, so `AC-F02-11` ("the reviewer sees all three") is revised with that slice, and
`TEST-F02-11` gains the link. Slice 3: the lists gain `total`, `page`, and `pageSize`, so `TEST-F04-02`, which expects
exactly `{ "requests": [] }`, changes.

## 5. Changes to shared documents (made in the same `docs` commit)

| Document | Change |
|---|---|
| System SDS | The query parameters, the decided route, the "Lists" convention, and the new screen |
| F-03 and F-04 contracts | A version row: their lists accept filters |
| Feature inventory and traceability | The link to this contract and the AC rows |

## 6. Definition of Done (feature)

The [Product Definition of Done](../sprint-1/README.md#product-definition-of-done) applies, plus, for each slice:

- [x] The AC of the slice have a passing automated test (slice 1)
- [x] TDD evidence: a failing test commit, then a passing implementation commit (slice 1)
- [x] The whole earlier regression passes on the same commit (slice 1; end to end with one worker)

## 7. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | `6531308` v0.1; `82fe87a` v0.2 with the five points of the contract review (PR #80), both before any test |
| Red commit(s) and failing test | `94b6bb2`: server 33 failed and 205 passed (the new test that passed is the case of `TEST-F08-09` for blank and unknown parameters, which guards earlier behaviour); client 11 failed and 93 passed; end to end 1 failed (`TEST-F08-13`) and 11 passed; type check exit 0 |
| Green commit(s) | `8c571af`. Then `f00597a` adds two cases to `TEST-F08-10` (a late answer must not replace a newer list; clearing empties values never applied): both passed when written, and each fails when the code it covers is removed. `71e32d1` removes a date guard that no test needed, because the database accepts the earliest date |
| PR (author → reviewer) | #80 (`Menelaus122` → `WirachatTH`) |
| Test run (command, commit, pass / fail / skip) | At `71e32d1`, local, 28 November: `cd server && npm test` 28 files, **238 passed, 0 failed, 0 skipped**; `cd client && npm test` 15 files, **106 passed**; `cd client && npm run e2e -- --workers=1` **12 passed**; type check and build exit 0 |
| Known limitations | Those of section 1.5. Slices 2 and 3 are not implemented. No pass by a person on the filter bar; not deployed; no performance measurement (NFR-14, F-10) |
