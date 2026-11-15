# F-04: Review decision and history (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-04): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-04 |
| Sprint | 1 |
| Status | Implemented (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-07, FR-08, FR-09; BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-14; NFR-02, NFR-07 |
| GitHub Issue | #7 (contract), #11 (implementation) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-01 (session), F-02 (policies: `REVIEWER` only for both routes), F-03 (`request` and `request_event` tables, `RequestDetail`, the Request Detail screen). SDS §3.3, §5, §6. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure | #13 |
| 0.2 | 2026-11-14 | Menelaus122 | First complete draft. Uses the BR-09 wording and the 1000-character reason boundary asked for in the review of PR #22. | Issue #7 (F-04 part) | #24 |
| 0.3 | 2026-11-14 | Menelaus122 | Stricter, named decision-fields `CHECK`, so a half-set decision or a reason on a submitted request is refused. AC-F04-14 uses a valid base row, a control insert, and one changed column per case, asserting constraint names, and adds the half-null cases. A reason that is not a string gets its own message. AC-F04-21 to AC-F04-23 added. The `TRUNCATE` gap is documented. AC-F04-20 relinked. Status: Agreed. | Review of PR #24 | #26 |
| 0.4 | 2026-11-15 | Menelaus122 | Wording only: the tables, constraints, and trigger come from F-03's two migrations (`add_requests` and `add_request_rules`). No change to any AC or test. | F-03 v0.4 | #10 |
| 0.5 | 2026-11-15 | Menelaus122 | AC-F04-14 and TEST-F04-14: cases (g) and (h) now start from a valid `request_event` row that is inserted first as a control, so the `UPDATE` and `DELETE` are refused by the trigger and not by a missing row. The database errors are asserted by SQLSTATE code and constraint name (`P0001` for the trigger). A note says these tests cannot be red in #11, because every rule they check was added by F-03's `add_request_rules` migration; they guard against a regression. | Review of PR #26; found while planning the red tests for #11 | #11 |
| 0.6 | 2026-11-15 | Menelaus122 | Status: Implemented; section 6 filled in. STS notes only, no change to any AC or behaviour: TEST-F04-09 also checks that the assigned reviewer can still decide the request after the two 404s, so it is red before the route exists (any request answered 404 then); TEST-F04-10 and the two "no panel" cases of TEST-F04-16 pass when first written and guard the green step, like TEST-F04-14. | Found while writing the red tests and the implementation for #11. The tests were changed first (`8cb661a`, `587d3e4`); this row brings the contract in line with them. | #11 |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-04 is the decision step of the workflow.
- A reviewer sees the `SUBMITTED` requests assigned to them (FR-07).
- They approve one, with an optional reason (FR-08), or reject it with a required reason (FR-09).
- The decision and a permanent history entry are written together, and the requester sees the outcome.

The rules that make this trustworthy are all enforced on the server, with the database as a backstop:
- only the assigned reviewer decides (BR-09)
- nobody decides their own request (BR-10)
- only `SUBMITTED` can be decided (BR-11)
- a rejection needs a reason (BR-12)
- history is append-only (BR-13)
- two competing decisions cannot both succeed (BR-14)

F-04 adds no table. It uses the decision columns and the trigger that F-03's migration created.

### 1.2 Workflow

**Inbox** (`GET /api/reviews/inbox`): F-02 admits `REVIEWER` only. The handler returns requests with
`assigned_reviewer_id` = caller and `status = SUBMITTED`, oldest first (`created_at ASC, id ASC`).

**Decide** (`POST /api/requests/:id/decision`). Checks run in this order, and the first failure answers:

1. **F-02:** origin guard, session (`401`), and role (`REQUESTER` → `403 FORBIDDEN`), before the body is read.
2. **Find the request.** A missing or non-numeric id → `404 NOT_FOUND`.
3. **Self-approval** (BR-10): if the caller is the request's **requester** → `403 SELF_APPROVAL_FORBIDDEN`. This is the normal path for a reviewer deciding a request they submitted, which BR-06 has assigned to someone else. So it runs before the next step.
4. **Record scope** (BR-09, BR-08): if the caller is **neither its requester nor its assigned reviewer** → `404 NOT_FOUND`, with a body identical to step 2's.
5. **Validate the body** (§1.4) → `400 VALIDATION_ERROR`.
6. **Status** (BR-11): if the request is not `SUBMITTED` → `409 INVALID_TRANSITION`.
7. **Write** (BR-13, BR-14), in one transaction:
   1. Conditional update:
      ```sql
      UPDATE request SET status = $new, decided_by_id = $me, decided_at = now(),
                         decision_reason = $reason, updated_at = now()
      WHERE id = $id AND status = 'SUBMITTED' AND assigned_reviewer_id = $me
      ```
   2. If **0 rows** changed, another decision won the race: roll back and answer `409 INVALID_TRANSITION`.
   3. Otherwise insert one `request_event` (`type` = `APPROVED` or `REJECTED`, `from_status = SUBMITTED`, `to_status` = the new status, `actor_id` = caller, `reason`), commit, and answer `200 { "request": RequestDetail }`.

Step 6 gives the usual answer for an already decided request. Step 7's condition is what makes simultaneous
decisions safe, because the database lets only one `UPDATE` match `status = 'SUBMITTED'`.

**Client:**
- Review Inbox lists the assigned requests, and each row opens Request Detail (from F-03).
- There, the assigned reviewer of a `SUBMITTED` request sees the decision panel.
- After a decision the page shows the updated request from the response.
- The requester sees the decision the next time they open the request.

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| BR-09: only the assigned reviewer decides. A `REQUESTER` gets `403`; a user who is neither the requester nor the assigned reviewer gets "not found". | F-02 role policy; handler step 4; `assigned_reviewer_id = $me` in the conditional update (server) |
| BR-10: nobody decides their own request (`403`) | Handler step 3, before record scope (server). The `CHECK (requester_id <> assigned_reviewer_id)` from F-03 means a requester is never also the assigned reviewer (DB). |
| BR-11: only `SUBMITTED` can be decided; the only transitions are `SUBMITTED → APPROVED` and `SUBMITTED → REJECTED` | Handler step 6, and the `WHERE status = 'SUBMITTED'` (server, DB) |
| BR-12: a rejection needs a reason that is not blank; any reason is at most 1000 characters | Handler validation; `CHECK (status <> 'REJECTED' OR (decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0))`; `decision_reason` and `reason` are `varchar(1000)` (server, DB) |
| BR-13: every decision adds exactly one history entry; entries are never changed | The event is inserted in the same transaction as the update; trigger `request_event_append_only`; no endpoint edits history (server, DB) |
| BR-14: of two simultaneous decisions, at most one succeeds; the other gets `409` and adds no entry | The conditional update's row count decides; the loser rolls back before inserting an event (server, DB) |
| Decision fields match the status: a submitted request has no decider, date, or reason; a decided one has both decider and date | `request_decision_fields`: `CHECK ((status = 'SUBMITTED' AND decided_at IS NULL AND decided_by_id IS NULL AND decision_reason IS NULL) OR (status <> 'SUBMITTED' AND decided_at IS NOT NULL AND decided_by_id IS NOT NULL))` (DB) |

### 1.4 Validation

| Field / input | Rule | Error returned (`400 VALIDATION_ERROR`, in `fields`) |
|---|---|---|
| `decision` | Exactly `"APPROVE"` or `"REJECT"` | "Choose approve or reject." |
| `reason` with `REJECT` | A string; after trimming, 1–1000 characters; stored trimmed | "Enter a reason to reject this request." (missing, `null`, empty, or only spaces) / "Enter the reason as text." (any other non-string, such as a number or an object) / "Reason must be 1,000 characters or fewer." |
| `reason` with `APPROVE` | Optional. Missing, `null`, or blank is stored as `NULL`; otherwise a string of 1–1000 characters after trimming, stored trimmed | "Reason must be 1,000 characters or fewer." / "Enter the reason as text." (not a string) |
| `:id` | A positive integer for a request the caller may see | Not a validation error: `404 NOT_FOUND` (§1.2 steps 2 and 4) |

### 1.5 Failure and boundary cases

- **Reason boundaries:** exactly 1000 characters after trimming is accepted; 1001 is refused. Spaces around the reason are trimmed first, so 1000 characters plus surrounding spaces is accepted.
- **A reviewer who submitted a request:** they see it in My Requests (F-03), not in their inbox, and deciding it answers `403 SELF_APPROVAL_FORBIDDEN`, even if the body is invalid (step 3 runs before step 5).
- **An unrelated reviewer** guessing an id gets `404` from both the detail (F-03) and the decision endpoint. The bodies are the same as for a missing id.
- **Deciding twice** (a double click, or two tabs): the first answers `200`; the second answers `409` from step 6, or from step 7 if they overlap. Either way only one event exists. The UI also disables the buttons while a request is in flight.
- **Approve and reject at the same moment**: exactly one wins, and the request's status, decider, reason, and single new event all belong to the winner.
- **Database error mid-transaction:** everything rolls back; the request stays `SUBMITTED` with no new event; the answer is `500 INTERNAL_ERROR`.
- **History editing attempt** (a bug or a manual SQL `UPDATE` or `DELETE` on `request_event`): the trigger raises `request_event is append-only` and nothing changes.
- **Known gap: `TRUNCATE`.** Row triggers do not fire on `TRUNCATE`, so it can still empty the table; tests rely on this to reset the database. The application never issues `TRUNCATE`, and no endpoint can trigger it. Sprint 1 accepts the gap; F-10 can revoke `TRUNCATE` from the runtime database role.

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| List review inbox | ❌ 403 | ✅ | ❌ 401 | `assigned_reviewer_id = caller` and `SUBMITTED` |
| Approve or reject | ❌ 403 | ✅ when assigned | ❌ 401 | Own request → `403 SELF_APPROVAL_FORBIDDEN`; neither requester nor assigned reviewer → `404`; not `SUBMITTED` → `409` |
| See the decision and history | ✅ own (F-03 detail) | ✅ own or assigned (F-03 detail) | ❌ 401 | As F-03 |
| Change or delete a decision or history entry | ❌ | ❌ | ❌ | No route; the trigger blocks it in the database |

### 1.7 Dependencies

- **F-02:** the two policies, both `REVIEWER` only, already in place from #9.
- **F-03:** the tables, constraints, and trigger (migrations `add_requests` and `add_request_rules`), the `RequestDetail` shape, and the Request Detail screen, which F-04 extends with the decision panel.
- **Test data:** the four seeded accounts. Requests are created in each test through the F-03 API, or by direct inserts for the constraint tests.

## 2. Layer specifications

### 2.1 UI

| Screen / element | Behaviour |
|---|---|
| Review Inbox (`/reviews`) | One row per request, oldest first: **Number**, **Title**, **Requester**, **Amount** (THB, `1,250.50`), **Submitted** (date). Each row opens `/requests/:id`. |
| Review Inbox: states | Loading: a spinner with "Loading your inbox…". Empty: "No requests are waiting for your review." Error: a message with **Try again**. |
| Decision panel (on Request Detail) | Shown **only** when the signed-in user is the assigned reviewer and the status is `SUBMITTED`. It has: **Reason** (a multi-line field labelled "Reason (required to reject)", with a live counter "0 / 1000"); **Approve** and **Reject** buttons. |
| Decision panel: validation | **Reject** with a blank reason shows "Enter a reason to reject this request." beneath the field (linked with `aria-describedby`), moves focus to the field, and sends nothing. More than 1000 characters shows "Reason must be 1,000 characters or fewer." and sends nothing. |
| Decision panel: busy | While a decision is in flight both buttons are disabled, and the clicked one reads "Saving…". |
| After success | The page re-renders from the response: the status badge changes, a **Decision** section shows the decider, date, and reason, the history gains the new line, and the panel disappears. A banner reads "Request approved." or "Request rejected." |
| After `409` | "This request has already been decided." The detail is fetched again, so the current status is shown and the panel disappears. |
| After `403` or `404` | "This request is not available to you." with no request data. |

### 2.2 API

| Method | Path | Auth / role | Request | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/reviews/inbox` | V | none | `200 { "requests": [ InboxItem ] }`, oldest first | `401`, `403 FORBIDDEN`, `500` |
| `POST` | `/api/requests/:id/decision` | V; record scope; rules | `{ "decision": "APPROVE" \| "REJECT", "reason"?: string \| null }` | `200 { "request": RequestDetail }` (shape from F-03) | `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `403 SELF_APPROVAL_FORBIDDEN`, `403 FORBIDDEN_ORIGIN`, `404 NOT_FOUND`, `409 INVALID_TRANSITION`, `500` |

```json
// InboxItem
{ "id": 12, "requestNumber": "REQ-000012", "title": "Oscilloscope for the electronics lab", "amount": "18500.00",
  "requester": { "id": 1, "name": "Ploy Srisawat" }, "createdAt": "2026-11-14T09:05:00.000Z" }

// 200 after a rejection: RequestDetail with
//   "status": "REJECTED", "decidedBy": { "id": 3, "name": "Mint Chaiyaporn" },
//   "decisionReason": "Please get a second quotation.", "decidedAt": "2026-11-14T10:00:00.000Z",
//   "history": [ { ... "type": "SUBMITTED" ... },
//                { "type": "REJECTED", "fromStatus": "SUBMITTED", "toStatus": "REJECTED",
//                  "actor": { "id": 3, "name": "Mint Chaiyaporn" }, "reason": "Please get a second quotation." } ]

{ "error": { "code": "SELF_APPROVAL_FORBIDDEN", "message": "You cannot decide a request you submitted." } }
{ "error": { "code": "INVALID_TRANSITION", "message": "This request has already been decided." } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields need attention.", "fields": { "reason": "Enter a reason to reject this request." } } }
```

### 2.3 Data

No change. F-04 writes `request.status`, `decided_by_id`, `decided_at`, `decision_reason`, and `updated_at`, and
inserts `request_event` rows. All of these columns, the `CHECK` constraints, and the trigger were created by F-03's
migrations (`add_requests` and `add_request_rules`).

## 3. Acceptance criteria

The examples use the seeded accounts: requesters Ploy and Nattapong, reviewers Mint and Korn.

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F04-01 | Mint is assigned two `SUBMITTED` requests (submitted at t1 < t2), one `APPROVED` request, and Korn is assigned one `SUBMITTED` request | Mint calls `GET /api/reviews/inbox` | Exactly Mint's two `SUBMITTED` requests, t1 first; each item has the `InboxItem` keys only | normal | FR-07, BR-08 |
| AC-F04-02 | Korn has nothing assigned | Korn calls the inbox | `200 { "requests": [] }` | boundary | FR-07 |
| AC-F04-03 | Ploy's `SUBMITTED` request assigned to Mint | Mint approves with no reason | `200`; `status` `APPROVED`; `decidedBy` Mint; `decidedAt` set; `decisionReason` `null`. The database has exactly one new event (`APPROVED`, from `SUBMITTED` to `APPROVED`, actor Mint, reason `NULL`), so 2 events in total. | normal | FR-08, BR-13 |
| AC-F04-04 | As above | Mint approves with the reason `"  Within budget  "` | `decisionReason` and the event's `reason` are `"Within budget"` | normal | FR-08, BR-12 |
| AC-F04-05 | As above | Mint rejects with the reason `"Please get a second quotation."` | `200`; `status` `REJECTED`; the reason is stored on the request and on the new `REJECTED` event | normal | FR-09, BR-12, BR-13 |
| AC-F04-06 | Fresh `SUBMITTED` requests assigned to Mint | Mint rejects with the reason missing, `null`, `""`, `"   "`, and a 1001-character reason; then rejects one with exactly 1000 characters; then approves one with 1001 characters | The five invalid rejections and the 1001-character approval answer `400` on `fields.reason`, and each request stays `SUBMITTED` with 1 event. The 1000-character rejection answers `200`. | boundary | BR-12 |
| AC-F04-07 | A `SUBMITTED` request assigned to Mint | Mint sends `decision` missing, `"approve"`, `"RETURN"`, and `1` | Each answers `400`, `fields.decision` = "Choose approve or reject."; nothing changes | negative | BR-11 |
| AC-F04-08 | Mint submitted a request assigned to Korn | Mint posts a decision on it, first with a valid body, then with an invalid body | Both answer `403 SELF_APPROVAL_FORBIDDEN`; the status and history are unchanged | negative | BR-10 |
| AC-F04-09 | Ploy's request assigned to Mint | Korn posts a valid decision on it, and Korn requests a missing id (`999999`) | Both answer `404 NOT_FOUND` with identical bodies containing only `error`; the request is unchanged | negative | BR-09, BR-08, NFR-02 |
| AC-F04-10 | Ploy's request assigned to Mint | Ploy (a `REQUESTER`) posts a decision on her own request | `403 FORBIDDEN` (the role check in F-02 comes first); nothing changes | negative | BR-09, NFR-02 |
| AC-F04-11 | A request Mint already approved | Mint approves it again, then rejects it with a reason | Both answer `409 INVALID_TRANSITION`; no new event; `status`, `decidedBy`, `decidedAt`, and `decisionReason` are unchanged | negative | BR-11 |
| AC-F04-12 | A fresh `SUBMITTED` request assigned to Mint, 20 times | Mint sends an approve and a reject (with a reason) at the same time | Each time exactly one answers `200` and the other `409`; the final status matches the `200` answer; exactly one decision event exists | boundary | BR-14 |
| AC-F04-13 | Mint rejected Ploy's request | Ploy opens its detail and her My Requests list | The detail shows `REJECTED`, `decidedBy` Mint, the reason, and `history` [`SUBMITTED`, `REJECTED`] in that order; My Requests shows the status `REJECTED` | normal | FR-09, FR-06 |
| AC-F04-14 | Direct SQL in a rolled-back transaction, bypassing the API, with helpers that build a valid `SUBMITTED` row, a valid `REJECTED` row (decider, date, and reason set), and a valid `request_event` row for a request | Control inserts of the valid rows (including an event), then one change per case: (a) `REJECTED` with `decision_reason` `NULL`; (b) `REJECTED` with `'   '`; (c) `APPROVED` with `decided_at` set and `decided_by_id` `NULL`; (d) `APPROVED` with `decided_by_id` set and `decided_at` `NULL`; (e) `SUBMITTED` with a `decided_by_id`; (f) `SUBMITTED` with a `decision_reason`; (g) `UPDATE` of the control `request_event` row; (h) `DELETE` of the control `request_event` row | The controls succeed. (a) and (b) fail on `request_rejection_reason` (`23514`); (c), (d), (e), and (f) fail on `request_decision_fields` (`23514`); (g) and (h) fail with the trigger's `request_event is append-only` (`P0001`). The data is unchanged. | negative | NFR-07, BR-12, BR-13 |
| AC-F04-15 | The Review Inbox screen | The API returns two items, then `[]`, then `500` | Rows show number, title, requester, amount, and date, oldest first, and a row opens its detail. Then "No requests are waiting for your review." Then an error with **Try again**. | normal | FR-07 |
| AC-F04-16 | Request Detail | It is viewed by the assigned reviewer of a `SUBMITTED` request, by its requester, and by the assigned reviewer after it is decided | The decision panel appears only in the first case | normal | FR-07, BR-09 |
| AC-F04-17 | The decision panel | (a) **Reject** with a blank reason; (b) 1001 characters typed; (c) **Approve** while the response is delayed | (a) The message appears beneath the field, focus is on it, and nothing is sent. (b) The length message appears and nothing is sent. (c) Both buttons are disabled and **Approve** reads "Saving…"; a second click sends nothing. | negative | BR-12, NFR-11 |
| AC-F04-18 | The decision panel | **Approve** succeeds (`200` with an `APPROVED` detail) | The badge reads Approved, a Decision section and a new history line appear, the panel disappears, and the banner reads "Request approved." | normal | FR-08 |
| AC-F04-19 | The decision panel | The API answers `409` | "This request has already been decided." is shown, the detail is fetched again, and the panel is gone | negative | BR-11, BR-14 |
| AC-F04-20 | The running stack with seeded data and a request Ploy submitted to Mint | Mint signs in, opens Review Inbox, opens the request, approves it, then reloads the inbox | After approving, the detail shows Approved; after the reload the request is no longer in the inbox | normal | FR-07, FR-08 |
| AC-F04-21 | A `SUBMITTED` request assigned to Mint | Mint rejects with `reason: 123`, then approves with `reason: { "text": "ok" }` | Both answer `400` with `fields.reason` = "Enter the reason as text."; nothing changes | negative | BR-12 |
| AC-F04-22 | A `SUBMITTED` request assigned to Mint | Mint rejects with a reason of exactly 1000 characters plus two spaces before and two after | `200`; the stored `decision_reason` and event `reason` are exactly the 1000 characters, without the spaces | boundary | BR-12 |
| AC-F04-23 | Mint submitted a request assigned to Korn | Mint and Korn each call `GET /api/reviews/inbox` | Mint's inbox does not contain the request; Korn's does | normal | FR-07, BR-10 |

## 4. Software Test Specification (STS)

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File / test name |
|---|---|---|---|---|---|---|
| TEST-F04-01 | AC-F04-01 | API-DB | Requests created through the F-03 API and one approved; created in time order | Mint `GET /api/reviews/inbox` | Exact ids in order; item keys exactly `id,requestNumber,title,amount,requester,createdAt` | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-02 | AC-F04-02 | API-DB | No request assigned to Korn | Korn calls the inbox | `200`, `requests` is `[]` | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-03 | AC-F04-03 | API-DB | Ploy's request for Mint | Mint `POST .../decision` `{ "decision": "APPROVE" }` | Response fields as stated; `request_event` count for the request = 2; the new row matches | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-04 | AC-F04-04 | API-DB | As above | Approve with `"  Within budget  "` | Stored reasons equal `"Within budget"` | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-05 | AC-F04-05 | API-DB | As above | Reject with the reason | `REJECTED`; the request and the event hold the reason | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-06 | AC-F04-06 | API-DB | Seven fresh requests for Mint | Table-driven over the seven cases | `400` on `fields.reason` for the six invalid ones, with status and event count unchanged; `200` for exactly 1000 characters | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-07 | AC-F04-07 | API-DB | A fresh request for Mint | Table-driven over the four `decision` values | `400` with the stated message; unchanged | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-08 | AC-F04-08 | API-DB | Mint's request for Korn | Mint decides it with a valid body, then with `{}` | `403 SELF_APPROVAL_FORBIDDEN` both times; status and event count unchanged | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-09 | AC-F04-09 | API-DB | Ploy's request for Mint | Korn decides it; Korn decides id `999999`; then Mint approves the request | `404` both; bodies deep-equal; keys `["error"]`; unchanged; then Mint's approval answers `200`, so the `404` was an ownership check and not a missing route | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-10 | AC-F04-10 | API-DB | As above | Ploy decides it | `403 FORBIDDEN`; unchanged. **This test passes when it is first written**, because F-02's route policy already refuses a `REQUESTER`; it guards against a regression and is not red evidence. | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-11 | AC-F04-11 | API-DB | A request Mint approved; its row read before | Approve again; reject with a reason | `409` both; event count and the four decision fields unchanged | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-12 | AC-F04-12 | API-DB (concurrency) | 20 fresh requests for Mint | For each, run approve and reject together with `Promise.all` | For each: the statuses sorted are `[200, 409]`; the final status equals the `200` decision; exactly one `APPROVED`/`REJECTED` event | `server/tests/sprint-1/decision-concurrency.api.test.ts` |
| TEST-F04-13 | AC-F04-13 | API-DB | Mint rejected Ploy's request | Ploy `GET` detail and `GET /api/requests/mine` | As stated, with `history[].type` = `["SUBMITTED","REJECTED"]` | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-14 | AC-F04-14 | DB integration | The `pg` driver, each case in a rolled-back transaction; helpers for a valid submitted row, rejected row, and event row | Insert the controls (the rows, then an event for one of them); then run (a) to (h), each as one changed column or statement | The controls succeed. Each case fails with the SQLSTATE code and the constraint name, or the message, listed in the AC, and a re-read shows the original values. **This test passes when it is first written**, because F-03's `add_request_rules` migration already holds every rule it checks; it guards against a regression and is not red evidence. | `server/tests/sprint-1/request-constraints.db.test.ts` |
| TEST-F04-15 | AC-F04-15 | component | Mocked inbox responses in sequence | Render; click a row; click **Try again** | As stated; the click navigates to `/requests/:id`; retry fetches again | `client/tests/sprint-1/ReviewInbox.test.tsx` |
| TEST-F04-16 | AC-F04-16 | component | Auth context plus detail fixtures for the three cases | Render each | The panel (by role `region`, named "Decision") is present only in the first case. **The two "absent" cases pass when first written**, because no panel exists yet; they guard the green step and are not red evidence. | `client/tests/sprint-1/DecisionPanel.test.tsx` |
| TEST-F04-17 | AC-F04-17 | component | Panel rendered; a fetch spy; a pending promise for (c) | Run (a) to (c) | As stated, including `aria-describedby`, focus, and fetch call counts | `client/tests/sprint-1/DecisionPanel.test.tsx` |
| TEST-F04-18 | AC-F04-18 | component | Mocked `200` with an `APPROVED` detail | Click **Approve** | The badge, Decision section, history line, hidden panel, and banner, as stated | `client/tests/sprint-1/DecisionPanel.test.tsx` |
| TEST-F04-19 | AC-F04-19 | component | Mocked `409`, then a detail fetch returning a decided request | Click **Reject** with a reason | The message is shown; the detail fetch is called again; the panel is absent | `client/tests/sprint-1/DecisionPanel.test.tsx` |
| TEST-F04-20 | AC-F04-20 | e2e | Running stack; the request is created through the API by Ploy in the test setup | Mint's journey as stated | Approved is shown; after the reload the inbox does not list the request | `client/e2e/sprint-1/reviews.spec.ts` |
| TEST-F04-21 | AC-F04-21 | API-DB | A fresh request for Mint | Send the two bodies | `400` both, with the stated message; status and event count unchanged | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-22 | AC-F04-22 | API-DB | A fresh request for Mint | Reject with `"  " + "x".repeat(1000) + "  "` | `200`; stored values have length 1000 and no surrounding spaces | `server/tests/sprint-1/reviews.api.test.ts` |
| TEST-F04-23 | AC-F04-23 | API-DB | Mint's agent submits a request for Korn | Call the inbox as Mint, then as Korn | The id is absent from Mint's list and present in Korn's | `server/tests/sprint-1/reviews.api.test.ts` |

**Coverage check:** AC-F04-01 to AC-F04-23 each map to exactly one TEST, and every test is automated.
- 17 run on the server against a real database: BR-08 to BR-14, NFR-02, and NFR-07, including the concurrency test and the constraint and trigger tests.
- 5 are component tests and 1 is an end-to-end test.

The full cross-user journey (submit, decide, requester sees the result) is #12's end-to-end suite.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [x] All AC in section 3 have a passing automated test
- [x] TDD evidence recorded for each rule (BR-09 to BR-14): failing test commit, then passing implementation commit
- [x] TEST-F04-12 passes in 20 of 20 iterations on a fresh database, and the run is recorded

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | `31bb14a` v0.2 (PR #24), `3f43071` v0.3 (PR #26), `a3ce9fe` v0.4 (wording, F-03 branch), `8e40c2a` v0.5 (this branch, before any test) |
| Red commit(s) and failing test | `8cb661a`: TEST-F04-01 to 13 and 15 to 23, plus the AC-F04-14 additions. Run before any implementation. **Server:** of the 19 new API cases (reviews and the 20-round race), **18 failed on assertions** (the decision route answered `404` instead of the expected status, and the inbox route did too) and **1 passed**: TEST-F04-10, because F-02's policy already answers `403`. **Client:** of 13 new cases, **11 failed** (no inbox rows, no Approve or Reject button, no reason field) and **2 passed** (the two "no panel" cases of TEST-F04-16). **e2e:** 1 failed (the inbox has no row for the request). The 10 new cases for AC-F04-14 in `request-constraints.db.test.ts` passed on purpose (v0.5 note). No failure was a syntax, import, or setup error. `587d3e4` is a test-only fix made during implementation: two assertions of TEST-F04-18 could not pass with the existing Decision section, because the decider is not in an element of its own and the same line is also the newest history entry. They now look the line up inside the Decision group and require it to appear twice, so nothing was loosened; the 7 DecisionPanel cases still failed without the implementation. |
| Green commit(s) | `546027b`: the same tests, all passing (`server/src/reviews.ts`, the inbox screen, the decision panel). |
| PR (author → reviewer) | Menelaus122 → WirachatTH; branch `feat/11-review-decision` (the PR number is in Issue #11) |
| Test run (command, commit, pass / fail / skip) | At `546027b`: `cd server && npm test`: 13 files, **124 passed, 0 failed, 0 skipped** (142 s; 29 are F-04: 19 API-DB cases including the race, and 10 database-rule cases). `cd client && npm test`: 8 files, **36 passed**. `cd client && npm run e2e` against an API built from this commit on port 3100: **4 passed** (Chromium). Type-check and build: exit 0 on both sides. TEST-F04-12: in each of the 20 rounds exactly one answer was `200` and one `409`, with one decision event. After the server run there were 0 leftover throwaway schemas. Node 24.14.0, PostgreSQL 16. |
| Known limitations | Return and resubmission (FR-13, FR-14) and the second approval (FR-15) are Sprint 2 (F-06, F-07). A decision cannot be undone. `TRUNCATE` bypasses the append-only trigger (§1.5). The inbox is not paginated in Sprint 1 (SRS A-04). The decision time comes from the database clock, in the same statement as the status change. |
