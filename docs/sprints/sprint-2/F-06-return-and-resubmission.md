# F-06: Return and resubmission (engineering contract)

> **Project Deliverable 2, Part B.** Write and commit this contract (`docs(F-06): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-06 |
| Sprint | 2 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-13, FR-14; FR-06, FR-07, FR-10; BR-04, BR-05, BR-08, BR-10, BR-11, BR-13, BR-14, BR-15, BR-16; NFR-02, NFR-07, NFR-11 |
| GitHub Issue | #71 |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-03 (request and history tables, `RequestDetail`, the Request Detail screen), F-04 (the decision, its order of checks, and the conditional update). SDS §3, §5, §6. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-27 | Menelaus122 | First complete draft | Issue #71 | |
| 0.2 | 2026-11-27 | Menelaus122 | AC-F06-22 covers the revision sent by all three panel actions. AC-F06-25 to -28 added: failed calls on the screens, a refused caller, the disabled buttons, and a database error. The answer of a write that changes no row, and the messages of `SELF_REVIEW_FORBIDDEN` and `NOT_REQUESTER`, are defined (AC-F06-04, -12, -17). The rollback limitation is a decided exception (D-15). `revision: null` counts as missing; a limitation of resubmission is listed. | Review of PR #73 | #73 |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

In Sprint 1 a reviewer can only approve or reject, and nobody can change a request after submission (BR-15). F-06 adds
the step in between:

- The assigned reviewer **returns** a `SUBMITTED` request with a comment. Its status becomes `RETURNED` (FR-13).
- The requester **edits and resubmits** it. It keeps its number and its reviewer, and goes back to `SUBMITTED` (FR-14).
- The history shows every return and every resubmission, and a request can go round this loop any number of times.

Because the content of a request can now change, a reviewer must not decide on content they have not seen. Each request
therefore has a **revision** number: 0 when submitted, one higher after each resubmission. A reviewer's action on a
resubmitted request must name the revision it was made on (§1.4).

**Q-05 (what happens to waiting requests if their reviewer is deactivated):** no reassignment is built. The product has
no function that deactivates an account (accounts come from the seed, D-11), and BR-16 keeps the reviewer through a
resubmission. Recorded as D-13.

### 1.2 Workflow and state transitions

| From | Operation | To | Who | History entry |
|---|---|---|---|---|
| (none) | Submit (F-03) | `SUBMITTED` | Requester | `SUBMITTED` |
| `SUBMITTED` | Approve (F-04) | `APPROVED` | Assigned reviewer | `APPROVED` |
| `SUBMITTED` | Reject (F-04) | `REJECTED` | Assigned reviewer | `REJECTED` |
| `SUBMITTED` | **Return** | `RETURNED` | Assigned reviewer | `RETURNED`, with the comment |
| `RETURNED` | **Resubmit** | `SUBMITTED` | Requester | `RESUBMITTED` |

Every other transition is refused with `409` and changes nothing. `APPROVED` and `REJECTED` stay final.

**Return** (`POST /api/requests/:id/return`). Checks run in this order, and the first failure answers:

1. **F-02:** origin guard, session (`401`), role (`REQUESTER` → `403 FORBIDDEN`), before the body is read.
2. A missing or non-numeric id → `404 NOT_FOUND`.
3. The caller is the request's requester → `403 SELF_REVIEW_FORBIDDEN` (BR-10).
4. The caller is not the assigned reviewer → `404 NOT_FOUND`, with the body of step 2 (BR-08).
5. Validate the body (§1.4) → `400 VALIDATION_ERROR`.
6. The request is not `SUBMITTED` → `409 INVALID_TRANSITION`.
7. The revision does not match (§1.4) → `409 STALE_REVISION`.
8. In one transaction: update the request where `id`, `status = 'SUBMITTED'`, `assigned_reviewer_id` = caller, and
   `revision` = the value read when the request was found, setting `status = 'RETURNED'`, `decided_by_id` = caller, `decided_at = $now`,
   `decision_reason = $comment`, `updated_at = $now`. If 0 rows change, roll back and answer as §1.4 says for a write that changes no row.
   Otherwise insert one `request_event` (`RETURNED`, `SUBMITTED → RETURNED`, the caller, the comment, `$now`) and
   answer `200 { "request": RequestDetail }`.

While a request is `RETURNED`, `decided_by_id`, `decided_at`, and `decision_reason` hold who returned it, when, and the
comment. This keeps the existing `request_decision_fields` constraint.

**Resubmit** (`POST /api/requests/:id/resubmission`):

1. **F-02:** origin guard and session (`401`). Both roles are allowed, because a reviewer can also submit requests.
2. A missing or non-numeric id → `404 NOT_FOUND`.
3. The caller is not the requester: the assigned reviewer → `403 NOT_REQUESTER`; anyone else → `404 NOT_FOUND`.
4. Validate the body (§1.4) → `400 VALIDATION_ERROR`.
5. The request is not `RETURNED` → `409 INVALID_TRANSITION`.
6. In one transaction: update the request where `id`, `status = 'RETURNED'`, and `requester_id` = caller, setting the
   title, description, and amount, `status = 'SUBMITTED'`, the four decision columns to `NULL`,
   `revision = revision + 1`, and `updated_at = $now`. If 0 rows change, roll back and answer as §1.4 says. Otherwise insert
   one `request_event` (`RESUBMITTED`, `RETURNED → SUBMITTED`, the caller, no reason, `$now`) and answer
   `200 { "request": RequestDetail }`.

**Decide** (F-04, changed): after F-04's step 6 and before its step 7, the revision is checked (§1.4), and the
conditional update of step 7 also matches the revision. A write that changes no row is answered as §1.4 says. Deciding a `RETURNED` request answers
`409 INVALID_TRANSITION` at step 6 with its own message.

### 1.3 Business rules enforced

| BR | How it is enforced (layer) |
|---|---|
| BR-16: only the assigned reviewer returns, only a `SUBMITTED` request, only with a comment | Role policy, steps 3 to 6, and the conditional update (server); `request_return_comment` and `request_event_return_comment` refuse a missing or blank comment (DB) |
| BR-16: only the requester edits and resubmits, only a `RETURNED` request; number and reviewer stay | Steps 3 and 5 and the conditional update (server); the update writes neither column |
| BR-15 (from Sprint 2): content changes only through resubmission | No other route writes title, description, or amount; `PATCH`, `PUT`, and `DELETE` stay `404` |
| BR-10: nobody returns their own request | Step 3 (server); `request_reviewer_not_requester` (DB) |
| BR-11: only the transitions of §1.2 | Status checks and conditional updates (server) |
| BR-13: one history entry per status change, never changed | Insert in the same transaction; the append-only trigger (DB) |
| BR-14: of two competing operations at most one succeeds | The conditional updates (server, DB) |
| BR-16 (added with F-06): a reviewer acts only on the revision they saw | The `revision` check and the conditional update (server) |

### 1.4 Validation

| Field / input | Rule | Error returned |
|---|---|---|
| `comment` (return) | A string; after trimming, 1 to 1000 characters, counted in code points; stored trimmed | `400`, `fields.comment`: "Enter a comment to return this request." (missing, `null`, empty, or only spaces) / "Enter the comment as text." (not a string) / "Comment must be 1,000 characters or fewer." |
| `title`, `description`, `amount` (resubmit) | The rules of F-03 §1.4, including 1,000,000.00 THB inclusive; every problem is reported at once | `400`, the messages of F-03 §1.4 |
| `assignedReviewerId`, `requesterId`, `status`, `requestNumber`, `revision` in a resubmission | Ignored | None |
| `revision` (decide and return) | Optional while the request's revision is 0; otherwise required. `null` counts as missing. When present, a whole number from 0 | Not a whole number: `400`, `fields.revision`: "Reload the request and try again." Missing when required, or different from the request's: `409 STALE_REVISION`, "This request was changed after you opened it. Check it again." |
| Status for return | `SUBMITTED` | `409 INVALID_TRANSITION`: "This request was returned to the requester for changes." (`RETURNED`) / "This request has already been decided." (`APPROVED`, `REJECTED`) |
| Status for decide | `SUBMITTED` | The same two messages |
| Status for resubmit | `RETURNED` | `409 INVALID_TRANSITION`: "Only a returned request can be resubmitted." |
| A write that changes no row (decide, return, resubmit) | The request is read again | `409`. Decide and return: `INVALID_TRANSITION` with the status message above for the status it now holds, or `STALE_REVISION` when it is `SUBMITTED` and only the revision differs. Resubmit: `INVALID_TRANSITION`, "Only a returned request can be resubmitted." |
| Caller of a return | Not the requester | `403 SELF_REVIEW_FORBIDDEN`, "You cannot return a request you submitted." |
| Caller of a resubmission | Not the assigned reviewer | `403 NOT_REQUESTER`, "Only the requester can resubmit this request." |

### 1.5 Failure and boundary cases

- **Comment boundaries:** 1 and 1000 characters are accepted; 1001 and blank are refused. There is no 10-character
  minimum: that rule belongs to rejection (BR-12).
- **Resubmitting without a change** is allowed: a return can be a question that the requester answers by pointing at
  what is already there. FR-14 does not require a change.
- **A resubmitted request in the inbox** keeps its creation time, so it takes its old place in the oldest-first order.
- **Two operations at once** (return and approve, return and reject, two returns, two resubmissions): exactly one
  succeeds, the other answers `409`, and one history entry is added.
- **A reviewer's old tab:** after a return and a resubmission, an approval sent from a screen loaded before them names
  no revision or an old one and is refused with `409 STALE_REVISION`.
- **Database error mid-transaction:** everything rolls back and the answer is `500 INTERNAL_ERROR`.
- **Known limitation:** the earlier title, description, and amount of a resubmitted request are not kept. The history
  shows who changed the state and when, not what the content was.
- **Known limitation:** a resubmission names no revision. An old tab of the requester can overwrite a newer
  resubmission if the request has been returned again in between.
- **Rollback (decided exception, D-15):** the migrations are additive, but the previous image does not know the new
  status and history values. Once a request holds one, that image cannot read it: the whole My Requests list of its
  requester fails (the list loads every row), and so does the detail of any request whose status or history holds a
  new value. Such a release is corrected by rolling forward (`deployment.md` section 6.2).

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| Return | ❌ 403 | ✅ when assigned | ❌ 401 | Own request → `403 SELF_REVIEW_FORBIDDEN`; neither requester nor assigned reviewer → `404` |
| Resubmit | ✅ own | ✅ own | ❌ 401 | The assigned reviewer → `403 NOT_REQUESTER`; anyone else → `404` |
| See the returned request, the comment, and the history | ✅ own (F-03) | ✅ own or assigned (F-03) | ❌ 401 | No change |

### 1.7 Dependencies

- **F-02:** two new rows in the policy table: return (`REVIEWER`) and resubmission (`REQUESTER`, `REVIEWER`).
- **F-03:** `RequestDetail` gains `revision`; the validation of a submission is reused; Request Detail and My Requests
  show the new status.
- **F-04:** the decision gains the revision check and the message for a returned request.
- **F-07** builds on these transitions.

## 2. Layer specifications

### 2.1 UI

| Screen / element | Behaviour |
|---|---|
| Return panel (Request Detail, assigned reviewer of a `SUBMITTED` request, below the decision panel) | Heading "Return for changes", a multi-line field "Comment for the requester (required to return)" with a counter, and the button **Return for changes**. A blank comment shows "Enter a comment to return this request." beneath the field and 1001 characters "Comment must be 1,000 characters or fewer."; the message is linked with `aria-describedby`, focus moves to the field, and nothing is sent. The button is disabled while sending |
| After a return | The page shows the updated request without reloading: status "Returned", a Decision section "Returned by <name> · <time>" with the comment, the new history entry, no panels, and the banner "Request returned." |
| Resubmit form (Request Detail, requester of a `RETURNED` request) | Heading "Edit and resubmit", the fields Title, Description, and Amount (THB) filled with the current values, the line "Reviewer: <name> (cannot be changed)", and the button **Resubmit**. The checks and messages of New Request (F-03 §2.1); nothing is sent while a field is invalid; focus moves to the first invalid field; typed values are kept on a failure. The button is disabled and reads "Saving…" while sending |
| After a resubmission | Status "Submitted", no Decision section, no form, the new history entry, and the banner "Request resubmitted." |
| Errors in these panels and the decision panel | `409` shows the message of the answer and loads the request again; `403` and `404` show "not available"; a `400` shows the field message; anything else "Something went wrong. Please try again." |
| Revision | The decision and return panels send `revision` when the request's revision is above 0 |
| My Requests | A returned request shows the status "Returned". Review Inbox: no change (it lists `SUBMITTED` only) |
| History | Entries "Returned by <name>" with the comment, and "Resubmitted by <name>" |

### 2.2 API

| Method | Path | Auth / role | Request | Success | Errors |
|---|---|---|---|---|---|
| `POST` | `/api/requests/:id/return` | `REVIEWER`; record scope | `{ "comment": string, "revision"?: number }` | `200 { "request": RequestDetail }` | `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `403 FORBIDDEN_ORIGIN`, `403 SELF_REVIEW_FORBIDDEN`, `404 NOT_FOUND`, `409 INVALID_TRANSITION`, `409 STALE_REVISION`, `500` |
| `POST` | `/api/requests/:id/resubmission` | Signed in; requester only | `{ "title": string, "description": string, "amount": string }` | `200 { "request": RequestDetail }` | `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN_ORIGIN`, `403 NOT_REQUESTER`, `404 NOT_FOUND`, `409 INVALID_TRANSITION`, `500` |
| `POST` | `/api/requests/:id/decision` (F-04) | No change | Gains `"revision"?: number` | No change | Gains `409 STALE_REVISION` |

`RequestDetail` gains `"revision": number`. `status` and a history entry's `type`, `fromStatus`, and `toStatus` gain the
new values.

```json
POST /api/requests/12/return
{ "comment": "Please attach the second quotation's total." }

200
{ "request": { "id": 12, "status": "RETURNED", "revision": 0,
  "decidedBy": { "id": 3, "name": "Mint Chaiyaporn" }, "decisionCategory": null,
  "decisionReason": "Please attach the second quotation's total.", "...": "..." } }
```

```json
POST /api/requests/12/decision          (after one resubmission, from an old screen)
{ "decision": "APPROVE" }

409
{ "error": { "code": "STALE_REVISION", "message": "This request was changed after you opened it. Check it again." } }
```

### 2.3 Data

Two additive migrations. The first is committed before the red tests, so that the database test fails on missing rules
and not on missing values (as in F-04 v0.10).

| Migration | Change |
|---|---|
| `add_request_return` | `RequestStatus` gains `RETURNED`; `RequestEventType` gains `RETURNED` and `RESUBMITTED`; `request.revision INTEGER NOT NULL DEFAULT 0` |
| `add_request_return_rules` | `request_return_comment`: `CHECK (status <> 'RETURNED' OR (decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0))`; `request_event_return_comment`: the same for a `RETURNED` history row and its `reason`; `request_revision_not_negative`: `CHECK (revision >= 0)` |

The existing constraints are not changed: `request_decision_fields` requires a decider and a time for a returned request,
and `request_category_only_on_rejection` keeps a category off it. No data is backfilled; existing requests have
revision 0.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F06-01 | A `SUBMITTED` request assigned to Mint | Mint returns it with a comment that has spaces around it | `200`; status `RETURNED`; Mint, the time, and the trimmed comment are stored; no category; exactly one new `RETURNED` history entry with the same actor, comment, and time | normal | FR-13, BR-13, BR-16 |
| AC-F06-02 | `SUBMITTED` requests assigned to Mint | Mint returns with the comment missing, `null`, `""`, spaces, a number, and 1001 characters | `400` with the matching `fields.comment`; nothing changes | negative | BR-16 |
| AC-F06-03 | `SUBMITTED` requests assigned to Mint | Mint returns with a comment of 1 character, of 1000 characters inside outer spaces, and of 1000 emoji | Each `200`, stored trimmed | boundary | BR-16 |
| AC-F06-04 | A request Mint is assigned to, and a request Mint submitted to Korn | A requester, no session, Korn on the first, and Mint on the second try to return | `403 FORBIDDEN`, `401`, `404` identical to a missing id, and `403 SELF_REVIEW_FORBIDDEN` with its message (also with an invalid body); nothing changes | role | BR-08, BR-10, BR-16, NFR-02 |
| AC-F06-05 | An approved, a rejected, and a returned request | Mint returns each | `409 INVALID_TRANSITION` with the matching message; nothing changes | negative | BR-11, BR-16 |
| AC-F06-06 | A returned request | Mint approves it, and rejects it with valid input | `409 INVALID_TRANSITION`, "This request was returned to the requester for changes."; nothing changes | negative | BR-11 |
| AC-F06-07 | A request Mint returned | Mint opens the inbox before and after Ploy resubmits | Absent, then present | normal | FR-07, FR-14 |
| AC-F06-08 | A request Mint returned to Ploy | Ploy resubmits with a new title, description, and amount | `200`; `SUBMITTED`; same number and reviewer; decision fields empty; revision 1; one new `RESUBMITTED` entry (`RETURNED → SUBMITTED`, Ploy, no reason); earlier entries unchanged | normal | FR-14, BR-13, BR-16 |
| AC-F06-09 | A returned request | Ploy resubmits the same values, and the body also names another reviewer, requester, status, number, and revision | `200`; the extra values change nothing | boundary | BR-15, BR-16, NFR-02 |
| AC-F06-10 | A returned request | Ploy resubmits with each invalid title, description, and amount of F-03 §1.4, including `1000000.01` | `400` with the fields; the request stays `RETURNED` and unchanged | negative | BR-04, BR-05 |
| AC-F06-11 | Returned requests | Ploy resubmits with amounts `0.01` and `1000000.00`, a 120-character title, and a 2000-character description | Each `200` | boundary | BR-04, BR-05 |
| AC-F06-12 | A returned request of Ploy assigned to Mint | Mint, Nattapong, Korn, and no session try to resubmit it | `403 NOT_REQUESTER` with its message, `404`, `404`, `401`; nothing changes | role | BR-08, BR-16, NFR-02 |
| AC-F06-13 | A submitted, an approved, and a rejected request of Ploy | Ploy resubmits each | `409 INVALID_TRANSITION`, "Only a returned request can be resubmitted."; nothing changes | negative | BR-11, BR-15 |
| AC-F06-14 | A request resubmitted once | Mint approves, rejects, and returns it without `revision` and with 0; then approves with 1 | `409 STALE_REVISION` for each of the first six; nothing changes; then `200` | negative | BR-16 |
| AC-F06-15 | A submitted request | Mint decides and returns with `revision` `"0"`, `-1`, and `1.5`, then with a different whole number, then approves with 0 | `400` with `fields.revision`; `409 STALE_REVISION`; `200` | boundary | BR-16 |
| AC-F06-16 | A request | It is returned, resubmitted, returned, resubmitted, and approved | The history lists `SUBMITTED`, `RETURNED`, `RESUBMITTED`, `RETURNED`, `RESUBMITTED`, `APPROVED` in order, each with its actor and comment; revision 2 | normal | FR-14, BR-13 |
| AC-F06-17 | A submitted request, and a returned one | A return and an approval arrive at the same time; two resubmissions arrive at the same time | Each pair: one `200`, one `409`; one new history entry; the request matches the winner. A losing approval says "This request was returned to the requester for changes.", a losing return "This request has already been decided.", and a losing resubmission "Only a returned request can be resubmitted." | boundary | BR-14 |
| AC-F06-18 | Direct SQL | A returned request or history row with a missing or blank comment, a returned request without a decider, a category on a returned request or entry, and a negative revision are written; an existing entry is updated | Each refused by the named constraint or the trigger; valid control rows are accepted | negative | BR-13, NFR-07 |
| AC-F06-19 | The Return panel | A blank comment, 1001 characters, then a valid comment | The messages beneath the field with focus and nothing sent; then one request `{comment}`, the banner "Request returned.", and no panels | normal | FR-13, NFR-11 |
| AC-F06-20 | Request Detail as the requester, the assigned reviewer, and another state | It is opened | The Return panel shows only for the assigned reviewer of a `SUBMITTED` request; the resubmit form only for the requester of a `RETURNED` request | role | BR-16, FR-10 |
| AC-F06-21 | The resubmit form | It opens; an invalid value is submitted; then valid values | Filled with the current values; messages beside the fields with focus and nothing sent; then status "Submitted", the banner "Request resubmitted.", and no form | normal | FR-14, NFR-11 |
| AC-F06-22 | A request with revision 1, open for Mint | Mint approves; on other loads of the page she rejects and returns; then an action is answered `409 STALE_REVISION` | The three bodies are `{ decision: "APPROVE", revision: 1 }`, a rejection with its reason, category, and `revision: 1`, and `{ comment, revision: 1 }`; the stale answer shows its message and loads the request again | negative | BR-16 |
| AC-F06-23 | A returned request | Ploy opens My Requests and the request | Status "Returned", the comment in the Decision section, and the history entries by label | normal | FR-06, FR-13 |
| AC-F06-24 | The running stack | Mint returns Ploy's request, Ploy edits and resubmits it, and Mint approves, using the keyboard for the new controls | Each screen shows the expected status; after a reload the history shows all four entries | normal | FR-13, FR-14, NFR-11 |
| AC-F06-25 | The resubmit form and the return panel with typed values | The API answers `400` with a field message, then `500`, then the network fails | The field message beneath its field with focus; then "Something went wrong. Please try again." for the other two; the typed values are kept | negative | FR-14, NFR-11 |
| AC-F06-26 | The return panel and the resubmit form | The API answers `403`, and `404` | The page says the request is not available, as in F-04, and shows none of its fields | role | BR-08, FR-10 |
| AC-F06-27 | The return panel and the resubmit form | The button is pressed while the call is on its way | The button is disabled and reads "Saving…"; one call is sent | boundary | NFR-11 |
| AC-F06-28 | A database in which writing the history entry fails | A return and a resubmission are sent | `500 INTERNAL_ERROR`; the request and its history are unchanged | negative | BR-13 |

## 4. Software Test Specification (STS)

Levels: **API-DB** is Supertest against PostgreSQL, **component** is Vitest with a mocked `fetch`, **e2e** is Playwright.
Server files are in `server/tests/sprint-2/`, client files in `client/tests/sprint-2/` and `client/e2e/sprint-2/`.
Each test starts from requests it creates itself; Ploy submits to Mint unless the row says otherwise.

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-F06-01 | AC-F06-01 | API-DB | New request | Return with `"  Add the total.  "`; read the rows | As the AC | `returns.api.test.ts` |
| TEST-F06-02 | AC-F06-02 | API-DB | New request per case | Table of invalid comments | `400`, exact `fields`; row and history unchanged | `returns.api.test.ts` |
| TEST-F06-03 | AC-F06-03 | API-DB | Three requests | Return with the three comments | `200`, stored trimmed | `returns.api.test.ts` |
| TEST-F06-04 | AC-F06-04 | API-DB | As the AC | The four callers | The four answers; unchanged | `returns.api.test.ts` |
| TEST-F06-05 | AC-F06-05 | API-DB | Three requests brought to each state through the API | Return | `409`, messages; unchanged | `returns.api.test.ts` |
| TEST-F06-06 | AC-F06-06 | API-DB | Returned request | Approve, reject | `409`, message; unchanged | `returns.api.test.ts` |
| TEST-F06-07 | AC-F06-07 | API-DB | Returned request | Read the inbox, resubmit, read again | Absent, present | `resubmission.api.test.ts` |
| TEST-F06-08 | AC-F06-08 | API-DB | Returned request | Resubmit new values; read the rows | As the AC | `resubmission.api.test.ts` |
| TEST-F06-09 | AC-F06-09 | API-DB | Returned request | Resubmit with extra fields | `200`; reviewer, requester, number kept; revision 1 | `resubmission.api.test.ts` |
| TEST-F06-10 | AC-F06-10 | API-DB | Returned request | Table of invalid bodies | `400`, exact `fields`; unchanged | `resubmission.api.test.ts` |
| TEST-F06-11 | AC-F06-11 | API-DB | A returned request per case | Boundary values | `200`, stored | `resubmission.api.test.ts` |
| TEST-F06-12 | AC-F06-12 | API-DB | Returned request | The four callers | The four answers; unchanged | `resubmission.api.test.ts` |
| TEST-F06-13 | AC-F06-13 | API-DB | Three requests | Resubmit | `409`; unchanged | `resubmission.api.test.ts` |
| TEST-F06-14 | AC-F06-14 | API-DB | Resubmitted once | The six stale calls, then approve with 1 | As the AC | `revision.api.test.ts` |
| TEST-F06-15 | AC-F06-15 | API-DB | New request | Invalid, different, and correct revisions | As the AC | `revision.api.test.ts` |
| TEST-F06-16 | AC-F06-16 | API-DB | New request | Two rounds and approve | Order, actors, comments, revision 2 | `resubmission.api.test.ts` |
| TEST-F06-17 | AC-F06-17 | API-DB | Repeated several times | `Promise.all` of the competing calls | One winner each time; the loser's message | `return-concurrency.api.test.ts` |
| TEST-F06-18 | AC-F06-18 | API-DB | Direct SQL in a rolled-back transaction, after the control rows | Each refused statement | SQLSTATE and constraint name | `return-constraints.db.test.ts` |
| TEST-F06-19 | AC-F06-19 | component | Mocked API | The three attempts | Messages, focus, calls, banner | `ReturnPanel.test.tsx` |
| TEST-F06-20 | AC-F06-20 | component | Mocked details for each case | Render | Which panels exist | `RequestDetailReturn.test.tsx` |
| TEST-F06-21 | AC-F06-21 | component | Mocked API | Open, invalid, valid | As the AC | `ResubmitForm.test.tsx` |
| TEST-F06-22 | AC-F06-22 | component | Mocked detail with revision 1 | Approve, reject, return; then a `409 STALE_REVISION` | Bodies with the revision; message and reload | `ReturnPanel.test.tsx` |
| TEST-F06-23 | AC-F06-23 | component | Mocked list and detail | Render | Labels and comment | `RequestDetailReturn.test.tsx` |
| TEST-F06-24 | AC-F06-24 | e2e | Running stack, seeded; request created through the API | The journey | As the AC | `return.spec.ts` |
| TEST-F06-25 | AC-F06-25 | component | Mocked `400`, `500`, and a rejected fetch | Submit | Messages, focus, kept values | `ResubmitForm.test.tsx` and `ReturnPanel.test.tsx` |
| TEST-F06-26 | AC-F06-26 | component | Mocked `403` and `404` | Submit | Not available, no fields | `ResubmitForm.test.tsx` and `ReturnPanel.test.tsx` |
| TEST-F06-27 | AC-F06-27 | component | A call that does not settle | Press twice | Disabled, one call | `ResubmitForm.test.tsx` and `ReturnPanel.test.tsx` |
| TEST-F06-28 | AC-F06-28 | API-DB | A temporary trigger that refuses the new history row, removed after the test | Return, resubmit | `500`; rows unchanged | `return-rollback.api.test.ts` |

**Coverage check:** every AC above maps to one TEST with the same number.

**Earlier tests that must change** (the response gains a key): the exact key list of `TEST-F03-01` and `TEST-F03-12`
gains `revision`, and the client fixtures of a request detail gain `revision: 0`. No assertion is removed or loosened.

## 5. Definition of Done (feature)

The [Product Definition of Done](../sprint-1/README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test
- [ ] TDD evidence: a failing test commit, then a passing implementation commit
- [ ] The whole Sprint 1 regression (server, client, end to end) passes on the same commit

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | |
