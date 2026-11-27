# F-03: Submit and view own requests (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-03): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-03 |
| Sprint | 1 |
| Status | v0.6 behaviour implemented (rejection category, #65; evidence in F-04 section 6); the review of PR #66 is open (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-04, FR-05, FR-06; BR-03, BR-04, BR-05, BR-06, BR-07, BR-08, BR-13 (submission entry), BR-15; NFR-02, NFR-07, NFR-11 |
| GitHub Issue | #7 (contract), #10 (implementation), #65 (v0.6 change) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-01 (session), F-02 (route policies for every route below), F-05 (schema baseline, seed, `createApp`). F-04 depends on this feature. SDS §3, §4, §5. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure | #13 |
| 0.2 | 2026-11-14 | Menelaus122 | First complete draft | Issue #7 (F-03 part) | #24 |
| 0.3 | 2026-11-14 | Menelaus122 | Constraints are named, and AC-F03-09 uses a valid base row, a control insert, and one changed column per case, asserting the constraint name. The decision-fields `CHECK` is stricter. FKs point to `app_user`. AC-F03-05 lists the message per input. AC-F03-21 added (markup shown as text). AC-F03-20 relinked. Status: Agreed. | Review of PR #24 | #26 |
| 0.4 | 2026-11-15 | Menelaus122 | The data change is applied as **two additive migrations**: `add_requests` (the enums, the two tables, their indexes and foreign keys) and `add_request_rules` (the number sequence and default, the four named `CHECK` constraints, and the append-only trigger). The split lets the constraint tests (TEST-F03-09) fail first, against tables that exist but have no rules, instead of failing on a missing table. | Found while planning the red tests for #10 | #10 |
| 0.5 | 2026-11-15 | Menelaus122 | `assignedReviewerId` above 2,147,483,647 is refused with "Choose a reviewer.", as the detail route already treats ids above the column's maximum; AC-F03-07 and TEST-F03-07 add `2147483648` and `1e20`. | Review of PR #29: such a value would reach the database lookup and fail with a `500` | #11 |
| 0.6 | 2026-11-26 | Menelaus122 | `RequestDetail` gains `decisionCategory` and each history entry gains `category` (both `null` unless a rejection recorded one); Request Detail shows it (F-04 v0.9). The exact key list asserted by TEST-F03-01 and TEST-F03-12 gains `decisionCategory`. No other AC or test changes. | Change request #65 (Lab 7) | #65 |
| 0.7 | 2026-11-26 | Menelaus122 | Status: the v0.6 behaviour is implemented. No change to any AC, behaviour, or test. | Implementation of #65: green `5890f39` | #65 |
| 0.8 | 2026-11-27 | Menelaus122 | `RequestDetail` gains `revision`, and the status and history values gain those of return and resubmission (F-06 contract §2.2). The exact key list of `TEST-F03-01` and `-12` gains `revision`. | Issue #71 (F-06) | #71 |
| 0.9 | 2026-11-27 | Menelaus122 | `RequestDetail` gains `firstApproval`, and the detail is also visible to a reviewer while the request waits for a second approval and to the second decider (F-07 contract §2.2). The exact key list of `TEST-F03-01` and `-12` gains `firstApproval`. | Issue #76 (F-07) | #76 |
| 0.10 | 2026-11-28 | Menelaus122 | My Requests accepts the filters of the F-08 contract (§1.4, §2.2). Without parameters it answers as before until F-08 slice 3 adds paging. | Issue #79 (F-08) | #79 |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-03 lets any signed-in user submit a purchase or funding request to one reviewer they choose, and then follow
their own requests: the list, each request's detail, its decision, and its history.
- Requesters and reviewers can both submit (SRS D-02).
- The request is always created as `SUBMITTED`, by the signed-in user, with a number the database generates.
- Nobody can edit or delete it afterwards in Sprint 1 (BR-15).

F-03 also adds the request tables, so F-04 needs no schema change.

### 1.2 Workflow

**Submit** (`POST /api/requests`):
1. F-02 runs first: origin guard, session, and policy (roles R and V).
2. Validate the body (§1.4). On any field error, answer `400 VALIDATION_ERROR` with every bad field in `fields`, and write nothing. Fields the client should not set (`requesterId`, `status`, `requestNumber`, `decidedById`, and so on) are **ignored** (BR-03).
3. Inside one transaction:
   1. Read the chosen reviewer. If it is missing, inactive, or not a `REVIEWER`, answer `400` (`fields.assignedReviewerId`). If it is the caller, answer `400` with the self-assignment message (BR-06).
   2. Insert the request with `requester_id` = the caller and `status = SUBMITTED`. The database generates `request_number` (BR-07).
   3. Insert one `request_event`: `type = SUBMITTED`, `from_status = NULL`, `to_status = SUBMITTED`, `actor_id` = the caller (BR-13).
4. Answer `201 { "request": RequestDetail }`.

**My requests** (`GET /api/requests/mine`): the caller's own requests (`requester_id` = caller), newest first
(`created_at DESC, id DESC`). A request that is only *assigned* to the caller is not "mine"; it appears in the
F-04 inbox.

**Request detail** (`GET /api/requests/:id`):
- The request is visible only if the caller is its requester or its assigned reviewer (BR-08).
- Otherwise, including a missing id or a non-numeric id, the answer is `404 NOT_FOUND`, the same in every case, so existence is never revealed.
- The response includes the history, oldest first (`created_at ASC, id ASC`).

**Reviewers list** (`GET /api/reviewers`): active users with the `REVIEWER` role, excluding the caller, sorted by
name. Each entry has only `id` and `name`.

**Client:**
- New Request loads the reviewers, validates on submit, and posts.
- On `201` it opens the new request's detail with "Request REQ-000123 submitted."
- My Requests and Request Detail read the two GET endpoints.

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| BR-03: the requester is always the signed-in user | The handler sets `requester_id` from `req.user.id` and ignores every client-supplied identity field (server) |
| BR-04: 0 < amount ≤ 1,000,000.00 THB, two decimals at most | Handler validation; `CHECK (amount > 0 AND amount <= 1000000.00)` on a `NOT NULL` `DECIMAL(12,2)` column (server, DB) |
| BR-05: title 1–120, description 1–2000 characters after trimming | Handler validation stores the trimmed values; `NOT NULL` columns `VARCHAR(120)` and `VARCHAR(2000)` (server, DB) |
| BR-06: the reviewer is an active `REVIEWER` and not the requester | Handler check inside the insert's transaction; `CHECK (requester_id <> assigned_reviewer_id)` (server, DB) |
| BR-07: starts `SUBMITTED`, with a unique system number `REQ-######` | Column default `SUBMITTED`; `request_number` default from `request_number_seq`; `UNIQUE (request_number)` (DB) |
| BR-08: visible only to its requester and its assigned reviewer; otherwise "not found" | Detail query scoped to `requester_id = me OR assigned_reviewer_id = me`; the list is scoped to `requester_id = me` (server) |
| BR-13: submission adds exactly one history entry | Event inserted in the same transaction as the request (server, DB) |
| BR-15: no edit or delete after submission | No `PATCH`, `PUT`, or `DELETE` route exists, so F-02 answers `404` (server) |

### 1.4 Validation

| Field / input | Rule | Error returned (`400 VALIDATION_ERROR`, in `fields`) |
|---|---|---|
| `title` | A string; after trimming, 1–120 characters; stored trimmed | "Enter a title." / "Title must be 120 characters or fewer." |
| `description` | A string; after trimming, 1–2000 characters; stored trimmed | "Enter a description." / "Description must be 2,000 characters or fewer." |
| `amount` | A **string** matching `^\d{1,7}(\.\d{1,2})?$`, with a value from 0.01 to 1000000.00 | "Enter an amount." (missing or empty) / "Enter the amount as a number, for example 1250.50." (wrong format or not a string) / "Enter an amount greater than 0." / "Enter an amount of at most 1,000,000.00 THB." |
| `assignedReviewerId` | A positive integer of at most 2,147,483,647 (the largest value of the database column); the user exists, is active, and has the `REVIEWER` role | "Choose a reviewer." (missing, not an integer, below 1, or above 2,147,483,647) / "Choose an active reviewer." (no such user, inactive, or not a reviewer) |
| `assignedReviewerId` equal to the caller | Refused | "You cannot be the reviewer of your own request." |
| `:id` in `/api/requests/:id` | A positive integer for a request the caller may see | Not a validation error: `404 NOT_FOUND` |

All field checks run before the database is touched, and all failing fields are reported together. The reviewer
checks need the database, so they run inside the transaction (§1.2 step 3).

### 1.5 Failure and boundary cases

- **Exact limits:** 0.01, 1000000.00, a 120-character title, and a 2000-character description are accepted. 0, 1000000.01, three decimals, 121 characters, and 2001 characters are refused.
- **Leading and trailing spaces** are trimmed before the length check and before storing. A title of only spaces counts as missing.
- **Forged fields** (`requesterId`, `status: "APPROVED"`, `requestNumber`) are ignored: the stored request is the caller's, `SUBMITTED`, and gets a generated number.
- **A request number is skipped when an insert fails** (sequences are not rolled back), so numbers can have gaps. They stay unique and increasing; gaps are expected.
- **A reviewer submits a request:** allowed, as long as it is assigned to another reviewer. The second seeded reviewer exists for this.
- **No reviewer available** (all inactive, or the caller is the only reviewer): `GET /api/reviewers` answers `[]`, and the form says so and cannot be submitted.
- **Database error during submit:** the transaction rolls back, leaving no request and no event, and the answer is `500 INTERNAL_ERROR`.
- **Detail of a request the caller lost access to:** in Sprint 1 a request's requester and reviewer never change, so access never changes.

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| List active reviewers | ✅ | ✅ | ❌ 401 | Excludes the caller |
| Submit a request | ✅ | ✅ | ❌ 401 | Requester = caller; reviewer ≠ caller |
| List my requests | ✅ | ✅ | ❌ 401 | `requester_id = caller` |
| View a request and its history | ✅ own | ✅ own or assigned | ❌ 401 | Otherwise `404`, with no data |
| Edit or delete a request | ❌ | ❌ | ❌ | No route (`404`) |

### 1.7 Dependencies

- **F-01 and F-02:** the session, and the policies for the four routes, already in `ROUTE_POLICIES` from #9.
- **F-05:** the `User` table, the seeded accounts (two requesters, two reviewers), and `createApp({ prisma, config })`.
- **The migrations `add_requests` and `add_request_rules`**, both additive (§2.3).
- **F-04** decides the requests this feature creates and reuses `RequestDetail` and the Request Detail screen.

## 2. Layer specifications

### 2.1 UI

| Screen | Behaviour |
|---|---|
| New Request (`/requests/new`) | Fields: **Title**; **Description** (multi-line); **Amount (THB)** (`inputmode="decimal"`); **Reviewer** (a select whose first option is "Choose a reviewer", filled from `GET /api/reviewers`). Button **Submit request**. |
| New Request: validation | The client runs the §1.4 field rules on submit. Messages appear beneath their fields, linked with `aria-describedby`; focus moves to the first invalid field; the typed values are kept; no request is sent. A `400` from the API shows its `fields` messages the same way. |
| New Request: states | Loading the reviewers: a spinner in place of the select. No reviewers: "No reviewers are available right now.", and the button is disabled. Submitting: the button reads "Submitting…" and is disabled. `500` or network: "Something went wrong. Please try again.", with the values kept. |
| New Request: success | It navigates to `/requests/:id` and shows a success banner: "Request REQ-000123 submitted." |
| My Requests (`/requests`) | One row per request, newest first: **Number**, **Title**, **Amount** (THB, with grouping and two decimals, for example `1,250.50`), **Status** (a badge with text), **Reviewer**, **Submitted** (date, Asia/Bangkok). Each row links to the detail. |
| My Requests: states | Loading: a spinner with "Loading your requests…". Empty: "You have not submitted any requests yet." with a link to New Request. Error: a message with **Try again**. |
| Request Detail (`/requests/:id`) | A heading with the number and status badge. Then title, description, amount, requester, reviewer, and submitted date. If decided: **Decision** (status, decided by, date, reason, and for a rejection the category, F-04 §2.1). **History**, oldest first, one line per entry: "Submitted by Ploy Srisawat · 14 Nov 2026 16:05", with the reason on its own line when there is one. |
| Request Detail: states | Loading: a spinner. `404`: a page with "This request is not available to you." and no request data, plus a link back to My Requests. Error: a message with **Try again**. |

### 2.2 API

| Method | Path | Auth / role | Request | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/reviewers` | R, V | none | `200 { "reviewers": [ { "id", "name" } ] }`, sorted by name | `401`, `500` |
| `POST` | `/api/requests` | R, V | `{ "title": string, "description": string, "amount": string, "assignedReviewerId": integer }` | `201 { "request": RequestDetail }` | `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN_ORIGIN`, `500` |
| `GET` | `/api/requests/mine` | R, V | none | `200 { "requests": [ RequestSummary ] }`, newest first | `401`, `500` |
| `GET` | `/api/requests/:id` | R, V; record scope | none | `200 { "request": RequestDetail }` | `401`, `404 NOT_FOUND`, `500` |

**Shapes:**

```json
// RequestSummary
{ "id": 12, "requestNumber": "REQ-000012", "title": "Oscilloscope for the electronics lab",
  "amount": "18500.00", "status": "SUBMITTED",
  "assignedReviewer": { "id": 3, "name": "Mint Chaiyaporn" }, "createdAt": "2026-11-14T09:05:00.000Z" }

// RequestDetail
{ "id": 12, "requestNumber": "REQ-000012", "title": "Oscilloscope for the electronics lab",
  "description": "Replace the broken unit in room 401.", "amount": "18500.00", "status": "SUBMITTED",
  "requester": { "id": 1, "name": "Ploy Srisawat" }, "assignedReviewer": { "id": 3, "name": "Mint Chaiyaporn" },
  "decidedBy": null, "decisionReason": null, "decisionCategory": null, "decidedAt": null,
  "createdAt": "2026-11-14T09:05:00.000Z", "updatedAt": "2026-11-14T09:05:00.000Z",
  "history": [ { "id": 31, "type": "SUBMITTED", "fromStatus": null, "toStatus": "SUBMITTED",
                 "actor": { "id": 1, "name": "Ploy Srisawat" }, "reason": null, "category": null,
                 "createdAt": "2026-11-14T09:05:00.000Z" } ] }

// 400
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields need attention.",
             "fields": { "amount": "Enter an amount greater than 0.", "assignedReviewerId": "Choose a reviewer." } } }
```

`amount` is always a string with exactly two decimals. No response includes an email, a password hash, or any user
other than the requester, the assigned reviewer, the decider, and the history actors.

### 2.3 Data

Two additive migrations. **`add_requests`** creates the enums, the two tables, their indexes, and the foreign keys. **`add_request_rules`** (hand-written SQL for what Prisma cannot express) adds the number sequence and default, the four named `CHECK` constraints, and the append-only trigger. The table below is the result of both:

| Object | Definition |
|---|---|
| `enum RequestStatus` | `SUBMITTED`, `APPROVED`, `REJECTED` |
| `enum RequestEventType` | `SUBMITTED`, `APPROVED`, `REJECTED` |
| `sequence request_number_seq` | Starts at 1 |
| `request` (Prisma `ApprovalRequest`) | `id` serial PK; `request_number` varchar(10) not null (constraint `request_number_unique`), default `'REQ-' \|\| lpad(nextval('request_number_seq')::text, 6, '0')`; `requester_id`, `assigned_reviewer_id` int not null → `app_user` `ON DELETE RESTRICT`; `title` varchar(120) not null; `description` varchar(2000) not null; `amount` decimal(12,2) not null; `status` RequestStatus not null default `SUBMITTED`; `decided_by_id` int null → `app_user` `ON DELETE RESTRICT`; `decision_reason` varchar(1000) null; `decided_at` timestamptz null; `created_at`, `updated_at` timestamptz not null |
| `request` constraints (named) | `request_amount_range`: `CHECK (amount > 0 AND amount <= 1000000.00)`. `request_reviewer_not_requester`: `CHECK (requester_id <> assigned_reviewer_id)`. `request_decision_fields`: `CHECK ((status = 'SUBMITTED' AND decided_at IS NULL AND decided_by_id IS NULL AND decision_reason IS NULL) OR (status <> 'SUBMITTED' AND decided_at IS NOT NULL AND decided_by_id IS NOT NULL))`. `request_rejection_reason`: `CHECK (status <> 'REJECTED' OR (decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0))`. |
| `request` indexes | `(requester_id, created_at)`, `(assigned_reviewer_id, status)` |
| `request_event` (Prisma `RequestEvent`) | `id` serial PK; `request_id` → `request`, `actor_id` → `app_user`, both int not null `ON DELETE RESTRICT`; `type` RequestEventType not null; `from_status` RequestStatus null; `to_status` RequestStatus not null; `reason` varchar(1000) null; `created_at` timestamptz not null default now(); index `(request_id, created_at, id)` |
| Trigger `request_event_append_only` | `BEFORE UPDATE OR DELETE ON request_event FOR EACH ROW` raises the exception `request_event is append-only` |

**v0.6:** F-04 v0.9 adds the nullable columns `request.decision_category` and `request_event.category` in its own migration (F-04 §2.3). This feature's two migrations are unchanged.

This feature tests the request-level constraints. F-04 tests the decision constraints and the append-only trigger.
`updated_at` has no database default (Prisma's `@updatedAt` sets it), so raw-SQL tests build rows with a helper
that supplies every `NOT NULL` column.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F03-01 | Requester Ploy signed in; reviewer Mint active | Ploy submits a valid request assigned to Mint | `201`; `request.status` is `SUBMITTED`; `requestNumber` matches `^REQ-\d{6}$`; `requester` is Ploy and `assignedReviewer` is Mint; the decision fields are `null`. In the database: one new `request` row and one `request_event` (`SUBMITTED`, from `NULL` to `SUBMITTED`, actor Ploy). | normal | FR-04, BR-07, BR-13 |
| AC-F03-02 | Reviewer Mint signed in | Mint submits a valid request assigned to reviewer Korn | `201`, requester Mint, reviewer Korn | normal | FR-04, SRS D-02 |
| AC-F03-03 | Ploy signed in | Ploy submits a valid body that also contains `requesterId` = Nattapong, `status: "APPROVED"`, `requestNumber: "REQ-999999"`, and `decidedById` = Mint | `201`; the stored request has requester Ploy, status `SUBMITTED`, a generated number other than `REQ-999999`, and no decider | negative | BR-03, BR-07 |
| AC-F03-04 | Ploy signed in | Ploy submits two valid requests one after the other | Two different numbers; the second is greater than the first | boundary | BR-07 |
| AC-F03-05 | Ploy signed in | Ploy submits amounts `"0.01"` and `"1000000.00"`, then each invalid input listed in *Then* | The first two answer `201`. Each invalid input answers `400` with exactly this `fields.amount`: `"0"` → "Enter an amount greater than 0."; `"1000000.01"` → "Enter an amount of at most 1,000,000.00 THB."; `"-5"`, `"12.345"`, `"abc"`, `"1,000"`, and the JSON number `100` → "Enter the amount as a number, for example 1250.50."; `""` and a missing amount → "Enter an amount.". The request count is unchanged after them. | boundary | BR-04 |
| AC-F03-06 | Ploy signed in | Ploy submits a 120-character title and a 2000-character description; then a 121-character title; a 2001-character description; a title of spaces; a missing description; and `"  Laptop  "` as the title | 120 and 2000 are accepted. 121, 2001, blank, and missing each answer `400` on the right field, and nothing is stored. The last request is stored with the title `"Laptop"`. | boundary | BR-05 |
| AC-F03-07 | Ploy signed in | `assignedReviewerId` is Nattapong (a requester), a reviewer set inactive in the test, `999999`, missing, `"3"` (a string), `2147483648` (one above the largest 4-byte integer), and `1e20` | The first three answer `400` "Choose an active reviewer."; the last four answer `400` "Choose a reviewer."; no request is stored, and no answer is `500` | negative | BR-06 |
| AC-F03-08 | Reviewer Mint signed in | Mint submits a request with `assignedReviewerId` = Mint | `400`, `fields.assignedReviewerId` = "You cannot be the reviewer of your own request."; nothing is stored | negative | BR-06 |
| AC-F03-09 | Direct SQL in a rolled-back test transaction, bypassing the API, with a helper that builds a valid `request` row (every `NOT NULL` column, including `updated_at`) | A control insert of the valid row, then the same row with one column changed per case: amount `0`; amount `1000000.01`; amount `NULL`; `assigned_reviewer_id` = `requester_id`; a duplicate `request_number` | The control succeeds. Each case fails, and the error names the expected constraint: `request_amount_range`, `request_amount_range`, not-null on `amount`, `request_reviewer_not_requester`, `request_number_unique` | negative | NFR-07, BR-04, BR-06, BR-07 |
| AC-F03-10 | Ploy signed in, then Mint; one reviewer inactive | `GET /api/reviewers` for each | Each gets the active reviewers only, sorted by name, each with only `id` and `name`; Ploy's list has Korn and Mint (not the inactive one, not requesters); Mint's list does not contain Mint | normal | FR-04, BR-06 |
| AC-F03-11 | Ploy has 2 requests, Nattapong 1, Mint has 1 assigned to them and none of their own; a new requester account has none | `GET /api/requests/mine` for each | Ploy gets exactly her 2, newest first; Nattapong his 1; Mint and the new account get `[]` | normal | FR-05, BR-08 |
| AC-F03-12 | Ploy's request assigned to Mint | Ploy, then Mint, request its detail | Both get `200` with the full `RequestDetail`, including `history` with the one `SUBMITTED` entry | normal | FR-06, BR-08 |
| AC-F03-13 | Ploy's request assigned to Mint | Nattapong (another requester) and Korn (an unrelated reviewer) request its detail; Ploy requests ids `999999` and `abc` | All four answer `404 NOT_FOUND`, with identical bodies containing only `error` | negative | BR-08, NFR-02 |
| AC-F03-14 | Ploy's request | Ploy sends `PATCH`, `PUT`, and `DELETE` to `/api/requests/:id` | Each answers `404`, and the request is unchanged | negative | BR-15 |
| AC-F03-15 | The New Request screen with reviewers loaded | The user fills the form validly and submits | The POST body has `amount` as a string and the chosen reviewer's id; the app navigates to `/requests/:id` and shows "Request REQ-… submitted." | normal | FR-04 |
| AC-F03-16 | The New Request screen | (a) Submit with every field blank; (b) amount `12.345`; (c) the API answers `400` with `fields.assignedReviewerId`; (d) submit while the response is delayed | (a) Four messages beneath their fields, linked with `aria-describedby`; focus on Title; no request sent. (b) The format message; no request sent. (c) The API message shows beneath Reviewer, and the other values are kept. (d) The button reads "Submitting…" and is disabled, and a second click sends nothing. | negative | FR-04, NFR-11 |
| AC-F03-17 | The New Request screen | `GET /api/reviewers` answers `[]` | "No reviewers are available right now." is shown and **Submit request** is disabled | boundary | FR-04 |
| AC-F03-18 | The My Requests screen | The API returns two requests, then `[]`, then `500` | Rows show number, title, amount `1,250.50`, a status badge with text, reviewer, and date, newest first. Then the empty message with a link to New Request. Then an error with **Try again**, which reloads. | normal | FR-05, NFR-11 |
| AC-F03-19 | The Request Detail screen | The API returns a submitted request, then `404` | The fields, status badge, and history line "Submitted by …" appear. Then "This request is not available to you." with no request fields shown. | normal | FR-06 |
| AC-F03-20 | The running stack with seeded data | Ploy signs in, submits a request, opens My Requests, and reloads the page | The new request is listed with status `SUBMITTED`, before and after the reload | normal | FR-04, FR-05 |
| AC-F03-21 | Ploy signed in | Ploy submits the title `<script>alert(1)</script>` and the description `<img src=x onerror=alert(1)>`, then views My Requests and the detail | The API stores and returns both strings exactly as typed. The screens show them as literal text, and no `script` or `img` element is created from them. | negative | FR-05, FR-06 |

## 4. Software Test Specification (STS)

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File / test name |
|---|---|---|---|---|---|---|
| TEST-F03-01 | AC-F03-01 | API-DB | Seeded test database; Ploy's agent | `POST /api/requests` with a valid body for Mint | Response fields as stated; `request` count +1; one `request_event` row with `type = SUBMITTED`, `from_status IS NULL`, `actor_id` = Ploy | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-02 | AC-F03-02 | API-DB | Mint's agent | Submit a request for Korn | `201`; `requester.id` = Mint, `assignedReviewer.id` = Korn | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-03 | AC-F03-03 | API-DB | Ploy's agent; ids from the seed | Submit with the four forged fields | The row read back: `requester_id` = Ploy, `status = SUBMITTED`, `request_number <> 'REQ-999999'`, `decided_by_id IS NULL` | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-04 | AC-F03-04 | API-DB | Ploy's agent | Submit twice | Numbers differ; the numeric part of the second is larger | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-05 | AC-F03-05 | API-DB | Ploy's agent | Table-driven over the 11 amount inputs, each with its expected message; count requests before and after the invalid ones | `201` for the two valid; `400` with exactly the listed `fields.amount` for each of the nine invalid; count unchanged across them | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-06 | AC-F03-06 | API-DB | Ploy's agent | Table-driven over the title and description inputs | As stated, including the stored title `"Laptop"` | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-07 | AC-F03-07 | API-DB | Ploy's agent; Korn set `is_active = false` in the test | Table-driven over the seven reviewer inputs | Messages as stated, never `500`; request count unchanged | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-08 | AC-F03-08 | API-DB | Mint's agent | Submit with `assignedReviewerId` = Mint | `400` with the stated message; count unchanged | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-09 | AC-F03-09 | DB integration | Raw SQL through Prisma `$executeRaw` in a transaction that is rolled back | Insert the helper's valid row (control); then, for each case, the same row with one column changed | The control succeeds. Each case fails with the named constraint: `request_amount_range` (twice), a not-null violation on `amount`, `request_reviewer_not_requester`, `request_number_unique`. The test asserts the constraint name, not just "an error". | `server/tests/sprint-1/request-constraints.db.test.ts` |
| TEST-F03-10 | AC-F03-10 | API-DB | Ploy's and Mint's agents; an extra inactive reviewer created in the test | `GET /api/reviewers` for each | Exact lists as stated; each item's keys are `["id","name"]` | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-11 | AC-F03-11 | API-DB | Requests created in the test as stated; a fresh requester account created in the test | `GET /api/requests/mine` for each | Exact ids per caller, in order | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-12 | AC-F03-12 | API-DB | Ploy's request for Mint | Detail as Ploy, then as Mint | `200` both; `history` has length 1 and type `SUBMITTED` | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-13 | AC-F03-13 | API-DB | As above | The four detail calls | All `404`; the four bodies deep-equal each other; keys `["error"]` | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-14 | AC-F03-14 | API-DB | Ploy's request | `PATCH`, `PUT`, `DELETE` on it; then read the row | `404` each; the row is unchanged (`updated_at` equal) | `server/tests/sprint-1/requests.api.test.ts` |
| TEST-F03-15 | AC-F03-15 | component | Mocked API: reviewers list; `POST` returns `201` with `REQ-000007` | Fill and submit | The fetch body matches; the location is `/requests/7`; the banner text is exact | `client/tests/sprint-1/NewRequest.test.tsx` |
| TEST-F03-16 | AC-F03-16 | component | Mocked API for (c) and (d) | Run (a) to (d) | As stated, including the `aria-describedby` targets, focus, fetch call counts, and the disabled button | `client/tests/sprint-1/NewRequest.test.tsx` |
| TEST-F03-17 | AC-F03-17 | component | Mocked reviewers `[]` | Render | The message is present; the submit button is disabled | `client/tests/sprint-1/NewRequest.test.tsx` |
| TEST-F03-18 | AC-F03-18 | component | Mocked list responses in sequence | Render; click **Try again** after the `500` | As stated; **Try again** causes a second fetch | `client/tests/sprint-1/MyRequests.test.tsx` |
| TEST-F03-19 | AC-F03-19 | component | Mocked detail responses | Render each | As stated; no title or amount text rendered for the `404` | `client/tests/sprint-1/RequestDetail.test.tsx` |
| TEST-F03-20 | AC-F03-20 | e2e | Running stack, seeded | Sign in as Ploy; submit; open My Requests; reload | The row with the new number and `SUBMITTED` is visible before and after the reload | `client/e2e/sprint-1/requests.spec.ts` |
| TEST-F03-21 | AC-F03-21 | API-DB + component | API: Ploy's agent submits the two strings. Component: the list and detail rendered with those strings in mocked responses. | Read back through the API; render both screens | The API returns identical strings. In the DOM, the text appears and `container.querySelector('script, img')` is `null` for the request content. | `server/tests/sprint-1/requests.api.test.ts`, `client/tests/sprint-1/RequestDetail.test.tsx` |

**Coverage check:** AC-F03-01 to AC-F03-21 each map to exactly one TEST, and every test is automated.
- 15 run on the server against a real database (TEST-F03-21 also has a component part). They carry the rule and ownership evidence (BR-03 to BR-08, BR-13, BR-15, NFR-02, NFR-07).
- 5 are component tests and 1 is an end-to-end test.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test
- [ ] TDD evidence recorded for the rules (BR-03 to BR-08): failing test commit, then passing implementation commit
- [ ] The migration is additive and runs on a database that already has F-05's `init_identity`

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | `56053da` v0.2 (PR #24), `8dabe76` v0.3 (PR #26), `a3ce9fe` v0.4 (this branch, before any test: the data change is two migrations) |
| Red commit(s) and failing test | `93251c6`, after the table stubs `a739b4a` (migration `add_requests`): TEST-F03-01 to 21 against tables that exist but have no rules. Of 36 test cases, **33 failed on assertions** (server 19, client 13, e2e 1) and **3 passed**: the control row of TEST-F03-09, and its NOT NULL and unique cases, which the Prisma schema already enforces. The three `CHECK` cases and every API case failed. `c90f9e7` is a test-only fix made during implementation: the e2e locator for the New Request link matched two links on an empty My Requests page, so it is scoped to the menu. |
| Green commit(s) | `fabe92d`: the same tests, **36 passed** (migration `add_request_rules`, four route handlers, three screens) |
| PR (author → reviewer) | Menelaus122 → WirachatTH; branch `feat/10-submit-request` (the PR number is in Issue #10) |
| Test run (command, commit, pass / fail / skip) | At `fabe92d`: `cd server && npm test`: 11 files, **95 passed, 0 failed, 0 skipped** (121 s; 22 are F-03, 73 are from F-01, F-02, and F-05). `cd client && npm test`: 6 files, **23 passed**. `cd client && npm run e2e` against an API built from this commit on port 3100: **3 passed** (Chromium). Type-check and build: exit 0 on both sides. After the server run there were 0 leftover throwaway schemas. Node 24.14.0, PostgreSQL 16. |
| Known limitations | Lists are not paginated in Sprint 1 (SRS A-04; F-08 in Sprint 3). Request numbers can have gaps after failed inserts. Text is stored exactly as typed and only ever rendered as text (AC-F03-21). |
| Follow-up evidence (v0.5, reviewer id bound, PR #36) | Contract `041cb8f` (wording `59ab4e2`); red `7b6205e`: with `2147483648` the server answered `500` ("expected 500 to be 400"); green `532305a`: `400 "Choose a reviewer."` for any id above 2,147,483,647, and TEST-F03-07 now has 7 inputs. Release-candidate run at `7f8cf54` (code identical to `532305a` plus the later changes): `cd server && npm test`: 14 files, **131 passed, 0 failed, 0 skipped**; `cd client && npm test`: 8 files, **36 passed**; `cd client && npm run e2e`: **8 passed** (4 AC tests and the 4 release journeys). |
