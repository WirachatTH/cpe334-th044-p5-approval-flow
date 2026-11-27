# F-07: Multi-stage approval (engineering contract)

> **Project Deliverable 2, Part B.** Write and commit this contract (`docs(F-07): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-07 |
| Sprint | 2 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-15; FR-06, FR-07, FR-11; BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-14, BR-17; NFR-02, NFR-07, NFR-11 |
| GitHub Issue | #76 |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-04 (the decision), F-05 (the seed), F-06 (the statuses, the revision, and the order of checks as changed there) |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-27 | Menelaus122 | First complete draft | Issue #76; Q-06 confirmed by WirachatTH on 27 November, with the two-reviewer gap | |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

A request **above 100,000.00 THB** needs two approvals by two different reviewers (FR-15, BR-17). Exactly
100,000.00 THB needs one.

1. The assigned reviewer approves. The request is not approved yet: its status becomes `AWAITING_SECOND_APPROVAL`.
2. A **second reviewer**, any active reviewer who is neither the requester nor the first approver, approves it
   (`APPROVED`) or rejects it with a category and a reason (`REJECTED`).

**Rejection** is possible at each stage by the reviewer whose turn it is: the assigned reviewer while the request is
`SUBMITTED`, an eligible second reviewer while it waits. After approving, the first approver cannot act again.

**Q-06** is confirmed: threshold 100,000.00 THB (exclusive), status name `AWAITING_SECOND_APPROVAL`, no assignment of
the second reviewer (D-14).

**A third reviewer.** With two seeded reviewers, a request above the threshold that one of them submits would have
nobody for the second approval. The seed gains a third reviewer account (§2.3).

**Existing requests.** A request approved before this release stays `APPROVED` with its one approval. A request that is
still `SUBMITTED` and above the threshold needs two approvals from the release on.

### 1.2 Workflow and state transitions

| From | Operation | Condition | To | History entry |
|---|---|---|---|---|
| `SUBMITTED` | Approve, assigned reviewer | amount ≤ 100,000.00 | `APPROVED` | `APPROVED` |
| `SUBMITTED` | Approve, assigned reviewer | amount > 100,000.00 | `AWAITING_SECOND_APPROVAL` | `FIRST_APPROVED` |
| `SUBMITTED` | Reject, assigned reviewer | any amount | `REJECTED` | `REJECTED` |
| `AWAITING_SECOND_APPROVAL` | Approve, second reviewer | | `APPROVED` | `APPROVED` |
| `AWAITING_SECOND_APPROVAL` | Reject, second reviewer | | `REJECTED` | `REJECTED` |

Return and resubmission (F-06) stay as they are: a request can be returned only while `SUBMITTED`, so never after the
first approval. Every other transition answers `409` and changes nothing.

**Decide** (`POST /api/requests/:id/decision`). Checks in this order; the first failure answers:

1. **F-02:** origin guard, session (`401`), role (`403 FORBIDDEN`).
2. A missing or non-numeric id → `404 NOT_FOUND`.
3. The caller is the requester → `403 SELF_APPROVAL_FORBIDDEN` (BR-10).
4. Record scope (BR-08, BR-09). The caller passes as the assigned reviewer; as an eligible second reviewer while the
   request waits; or as the reviewer who gave the second decision. Anyone else → `404 NOT_FOUND`.
5. Validate the body (F-04 §1.4, F-06 §1.4) → `400 VALIDATION_ERROR`.
6. Status: `SUBMITTED` continues. `AWAITING_SECOND_APPROVAL`: the first approver → `403 SAME_APPROVER_FORBIDDEN`;
   another eligible reviewer continues. `APPROVED`, `REJECTED`, `RETURNED` → `409 INVALID_TRANSITION` with the messages
   of F-06 §1.4.
7. Revision (F-06 §1.4) → `409 STALE_REVISION`.
8. In one transaction, a conditional update on `id`, the status read, the revision, and either the assigned reviewer
   (`SUBMITTED`) or `first_approved_by_id <> caller` (waiting). 0 rows → roll back, `409 INVALID_TRANSITION`.
   - First approval: `status = 'AWAITING_SECOND_APPROVAL'`; the decision columns and `first_approved_by_id`,
     `first_approved_at` record the caller and `$now`; one `FIRST_APPROVED` entry.
   - Any final decision: the decision columns record the caller and `$now`; the first-approval columns are not touched;
     one `APPROVED` or `REJECTED` entry from the status read.

### 1.3 Business rules enforced

| BR | How it is enforced (layer) |
|---|---|
| BR-17: above the threshold, two approvals | Step 8 compares the stored amount (server); the threshold is a constant of the application |
| BR-17: two different reviewers | Step 6 and the conditional update (server); `request_second_approver_differs` (DB) |
| BR-09 (changed): who may decide | Step 4 (server) |
| BR-10: never the requester | Step 3 (server); `request_decider_not_requester` (DB) |
| BR-08 (changed): who may see | The queries of the detail and the inbox (server) |
| BR-11: only the transitions of §1.2 | Status checks and conditional updates (server) |
| BR-12: a rejection at either stage needs a category and a reason | The validation of F-04 (server) |
| BR-13: one history entry per status change | The same transaction; the append-only trigger (DB) |
| BR-14: one winner | The conditional update (server, DB) |

The database does not require two approvals for an amount above the threshold, because requests approved before this
release have one. The application enforces it.

### 1.4 Validation

No new input. The decision body is that of F-04 and F-06.

| Situation | Answer |
|---|---|
| The first approver decides a waiting request | `403 SAME_APPROVER_FORBIDDEN`, "A different reviewer must give the second approval." |
| Return of a waiting request | `409 INVALID_TRANSITION`, "This request is waiting for a second approval." |
| Resubmission of a waiting request | `409 INVALID_TRANSITION`, "Only a returned request can be resubmitted." (F-06) |

### 1.5 Failure and boundary cases

- **Threshold:** 100,000.00 → one approval; 100,000.01 → two. The comparison uses the stored decimal, not a float.
- **Two second reviewers at once**, or one approving while another rejects: one succeeds, the other gets `409`
  (`404` if it arrives after the decision is stored).
- **A second reviewer after the decision of another:** the request is no longer visible to them (`404`).
- **No eligible second reviewer** (only possible if accounts are deactivated in the database): the request keeps
  waiting (Q-05, D-13).
- **A returned and resubmitted request** above the threshold starts again at the first approval, and both approvals
  name the current revision.
- **Known limitation:** the first approver cannot withdraw an approval.
- **Known limitation (rollback):** the previous image cannot read the new status and history values.

### 1.6 Permissions

| Operation on a request above the threshold | Requester | Assigned reviewer | Another reviewer | Unauthenticated |
|---|---|---|---|---|
| See it while `SUBMITTED` | ✅ own | ✅ | ❌ 404 | ❌ 401 |
| See it while waiting | ✅ own | ✅ | ✅ unless requester | ❌ 401 |
| See it after the decision | ✅ own | ✅ | ✅ only the second decider | ❌ 401 |
| First approval or rejection | ❌ 403 | ✅ | ❌ 404 | ❌ 401 |
| Second approval or rejection | ❌ 403 | ❌ 403 | ✅ unless requester | ❌ 401 |

### 1.7 Dependencies

- **F-03:** `RequestDetail` gains `firstApproval`; My Requests and the detail show the new status.
- **F-04:** the decision and the inbox change as above.
- **F-05:** one more seeded account.
- **F-06:** its statuses, revision, and messages.
- **F-09** counts the final statuses of this feature.

## 2. Layer specifications

### 2.1 UI

| Screen / element | Behaviour |
|---|---|
| Status | "Awaiting second approval" as a text badge; history entry "First approval by <name>" |
| Request Detail, waiting | A section "Decision" shows "First approval by <name> · <time>" with the reason if any |
| Decision panel | Shown to the assigned reviewer of a `SUBMITTED` request and to an eligible second reviewer of a waiting one |
| First approver of a waiting request | No panel; the line "Waiting for a second reviewer." |
| Return panel (F-06) | Only while `SUBMITTED` |
| After a first approval | Banner "Request approved. A second approval is needed." and the updated page |
| After a final decision | The banners of F-04 |
| `403 SAME_APPROVER_FORBIDDEN` | The message of the answer; the request is loaded again |
| Review Inbox | Also lists the waiting requests the caller may decide; a row shows "Second approval" beside its title |

### 2.2 API

| Method | Path | Change |
|---|---|---|
| `POST` | `/api/requests/:id/decision` | §1.2; new answer `403 SAME_APPROVER_FORBIDDEN` |
| `GET` | `/api/reviews/inbox` | Rows: `SUBMITTED` requests assigned to the caller, and waiting requests where the caller is neither requester nor first approver; oldest first. Each row gains `"status"` |
| `GET` | `/api/requests/:id` | Visible also to a reviewer while the request waits, and to the second decider |
| (all) | `RequestDetail` | Gains `"firstApproval": { "by": { "id", "name" }, "at": string } \| null` |

```json
200  (after the first approval)
{ "request": { "id": 15, "status": "AWAITING_SECOND_APPROVAL", "amount": "250000.00",
  "firstApproval": { "by": { "id": 3, "name": "Mint Chaiyaporn" }, "at": "2026-11-28T03:00:00.000Z" }, "...": "..." } }
```

### 2.3 Data

| Migration | Change |
|---|---|
| `add_second_approval` (before the red tests) | `RequestStatus` gains `AWAITING_SECOND_APPROVAL`; `RequestEventType` gains `FIRST_APPROVED`; `request.first_approved_by_id` (nullable, foreign key to `app_user`, `ON DELETE RESTRICT`) and `request.first_approved_at` (nullable) |
| `add_second_approval_rules` | `request_first_approval_fields`: `CHECK ((first_approved_by_id IS NULL) = (first_approved_at IS NULL))`; `request_awaiting_second_approval`: `CHECK (status <> 'AWAITING_SECOND_APPROVAL' OR (first_approved_by_id IS NOT NULL AND decided_by_id = first_approved_by_id))`; `request_second_approver_differs`: `CHECK (status NOT IN ('APPROVED', 'REJECTED') OR first_approved_by_id IS NULL OR decided_by_id <> first_approved_by_id)`; `request_decider_not_requester`: `CHECK (decided_by_id IS NULL OR decided_by_id <> requester_id)` |

While a request waits, the decision columns hold the first approval, so `request_decision_fields` is unchanged. Existing
rows satisfy every new constraint; nothing is backfilled.

**Seed:** a fifth account, Anan Wongsawat, `anan.reviewer@example.com`, `REVIEWER`, with the same
`DEMO_USER_PASSWORD`. The seed stays idempotent; its summary counts five accounts.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F07-01 | A `SUBMITTED` request of 100,000.01 assigned to Mint | Mint approves it with a reason | `200`; `AWAITING_SECOND_APPROVAL`; `firstApproval` names Mint and the time; one `FIRST_APPROVED` entry with the reason | normal | FR-15, BR-13, BR-17 |
| AC-F07-02 | Requests of 100,000.00 and 0.01 | The assigned reviewer approves each | Each `APPROVED`; `firstApproval` is `null`; one `APPROVED` entry | boundary | BR-17 |
| AC-F07-03 | A waiting request first approved by Mint | Anan approves it | `APPROVED` by Anan; `firstApproval` still Mint; history `SUBMITTED`, `FIRST_APPROVED`, `APPROVED` | normal | FR-15, BR-13 |
| AC-F07-04 | A waiting request | Anan rejects with a short reason and no category, then validly | `400` and nothing changes; then `REJECTED` with category and reason; history ends `FIRST_APPROVED`, `REJECTED` | negative | FR-15, BR-12 |
| AC-F07-05 | A `SUBMITTED` request above the threshold | The assigned reviewer rejects it | `REJECTED`; no first approval | normal | FR-15, BR-12 |
| AC-F07-06 | A request first approved by Mint | Mint approves and rejects it again | `403 SAME_APPROVER_FORBIDDEN`; nothing changes | role | BR-09, BR-17 |
| AC-F07-07 | A request Korn submitted to Mint, first approved by Mint | Korn decides it; then Anan approves | `403 SELF_APPROVAL_FORBIDDEN`; then `APPROVED` | role | BR-10, BR-17 |
| AC-F07-08 | A waiting request | A requester, and no session, decide it | `403 FORBIDDEN`, `401`; nothing changes | role | BR-09, NFR-02 |
| AC-F07-09 | A request above the threshold while `SUBMITTED` | Anan, not assigned, opens and decides it | `404` both, identical to a missing id | role | BR-08, BR-09, NFR-02 |
| AC-F07-10 | A waiting request, then decided by Anan | Anan, Korn, Nattapong open it before and after | Before: Anan and Korn `200`, Nattapong `404`. After: Anan `200`, Korn `404`; requester and Mint `200` throughout | role | FR-06, BR-08, NFR-02 |
| AC-F07-11 | A request Korn submitted to Mint above the threshold | The inboxes of Mint, Korn, and Anan are read before, after the first approval, and after the second | Mint only; then Anan only; then none. Each row carries its status | normal | FR-07, BR-08 |
| AC-F07-12 | A waiting request, and one approved by Mint and then Anan | Mint returns the first and Ploy resubmits it; Mint and Anan decide the second | `409` with the matching message; nothing changes | negative | BR-11 |
| AC-F07-13 | A waiting request; a `SUBMITTED` one above the threshold | Korn and Anan decide the first at the same time; Mint sends two approvals of the second at the same time | One `200` each time and one new entry. The other call is refused: `409`, or, if it arrives after the winner is stored, `404` for the second reviewer and `403` for the first approver | boundary | BR-14 |
| AC-F07-14 | A resubmitted request above the threshold | Each approval is sent without and with the current revision | `409 STALE_REVISION`; then `200` | negative | BR-14, BR-17 |
| AC-F07-15 | Direct SQL | Rows that break each new constraint are written; the earlier shapes of an approved request are written | Each refused by its constraint; the controls, including an approval without a first approval, are accepted | negative | BR-10, BR-17, NFR-07 |
| AC-F07-16 | An empty database, then a seeded one | The seed runs twice | Five accounts, three of them reviewers; the second run changes nothing | normal | FR-11 |
| AC-F07-17 | Request Detail as each person of a waiting request | It is opened and used | The panel for an eligible second reviewer; the waiting line and no panel for the first approver; no return panel; the banners of §2.1 | role | FR-15, NFR-11 |
| AC-F07-18 | A waiting request | My Requests, the inbox, and the history are shown | The labels "Awaiting second approval", "Second approval", and "First approval by <name>" | normal | FR-06, FR-07 |
| AC-F07-19 | The running stack | Ploy submits 250,000.00; Mint approves; Anan approves | Each screen shows the expected status; Ploy sees both approvals after a reload | normal | FR-15 |
| AC-F07-20 | Requests made before the migration: one approved above the threshold, one still `SUBMITTED` above it | After the migration both are read, and the second is approved | The first stays `APPROVED`; the second becomes `AWAITING_SECOND_APPROVAL` | boundary | BR-17, NFR-07 |

## 4. Software Test Specification (STS)

Levels as in F-06. Server files are in `server/tests/sprint-2/`, client files in `client/tests/sprint-2/` and
`client/e2e/sprint-2/`. Unless a row says otherwise, Ploy submits 250,000.00 to Mint.

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-F07-01 | AC-F07-01 | API-DB | 100,000.01 | Approve; read the rows | As the AC | `second-approval.api.test.ts` |
| TEST-F07-02 | AC-F07-02 | API-DB | Both amounts | Approve | As the AC | `second-approval.api.test.ts` |
| TEST-F07-03 | AC-F07-03 | API-DB | First approved | Anan approves | As the AC | `second-approval.api.test.ts` |
| TEST-F07-04 | AC-F07-04 | API-DB | First approved | Invalid then valid rejection | As the AC | `second-approval.api.test.ts` |
| TEST-F07-05 | AC-F07-05 | API-DB | New request | Mint rejects | As the AC | `second-approval.api.test.ts` |
| TEST-F07-06 | AC-F07-06 | API-DB | First approved | Mint, both decisions | `403`; unchanged | `second-approval-access.api.test.ts` |
| TEST-F07-07 | AC-F07-07 | API-DB | Korn submits to Mint | As the AC | As the AC | `second-approval-access.api.test.ts` |
| TEST-F07-08 | AC-F07-08 | API-DB | First approved | The two callers | As the AC | `second-approval-access.api.test.ts` |
| TEST-F07-09 | AC-F07-09 | API-DB | New request | Anan reads and decides | `404` | `second-approval-access.api.test.ts` |
| TEST-F07-10 | AC-F07-10 | API-DB | First approved, then Anan | The reads | As the AC | `second-approval-access.api.test.ts` |
| TEST-F07-11 | AC-F07-11 | API-DB | Korn submits to Mint | The inbox reads | As the AC | `second-approval-access.api.test.ts` |
| TEST-F07-12 | AC-F07-12 | API-DB | States reached through the API | The refused calls | `409`; unchanged | `second-approval.api.test.ts` |
| TEST-F07-13 | AC-F07-13 | API-DB | Repeated several times | `Promise.all` | One winner | `second-approval-concurrency.api.test.ts` |
| TEST-F07-14 | AC-F07-14 | API-DB | Returned and resubmitted | Approvals with and without revision | As the AC | `second-approval.api.test.ts` |
| TEST-F07-15 | AC-F07-15 | DB integration | Direct SQL in a rolled-back transaction | Controls and refused rows | SQLSTATE and constraint name | `second-approval-constraints.db.test.ts` |
| TEST-F07-16 | AC-F07-16 | integration | Empty database | Migrate, seed twice | As the AC | `seed-accounts.test.ts` |
| TEST-F07-17 | AC-F07-17 | component | Mocked details | Render and use | As the AC | `SecondApproval.test.tsx` |
| TEST-F07-18 | AC-F07-18 | component | Mocked lists and detail | Render | Labels | `SecondApproval.test.tsx` |
| TEST-F07-19 | AC-F07-19 | e2e | Running stack, seeded | The journey | As the AC | `second-approval.spec.ts` |
| TEST-F07-20 | AC-F07-20 | DB integration | Rows inserted in the earlier shape | Read and approve through the API | As the AC | `second-approval-constraints.db.test.ts` |

**Coverage check:** every AC above maps to one TEST with the same number.

**Earlier tests that must change.** The seed gains an account: the expected accounts and counts of `TEST-F05-01`,
`-02`, `-03`, `-07`, and `-19` go from four to five. The exact key list of `TEST-F04-01` gains `status`, and that of
`TEST-F03-01` and `-12` gains `firstApproval`; client fixtures gain the same fields. No assertion is removed or
loosened.

## 5. Changes to shared documents (made in the same `docs` commit)

| Document | Change |
|---|---|
| SRS BR-08 | A reviewer also sees a request that waits for a second approval (unless they submitted it) and one they gave the second decision on |
| SRS BR-09 | The assigned reviewer decides a `SUBMITTED` request; an eligible second reviewer decides a waiting one |
| SRS BR-11 | Adds `SUBMITTED → AWAITING_SECOND_APPROVAL → APPROVED` or `REJECTED` |
| SRS BR-17, Q-06, D-14 | Confirmed values; no assignment of a second reviewer |
| SRS NFR-07 | The database refuses a requester as decider and one person as both approvers |
| F-03 and F-04 contracts | A version row for the changes of §1.7 |
| F-05 contract | The fifth account. The README changes with the implementation |
| System SDS, feature inventory, traceability | Statuses, columns, constraints, answers, and the AC rows |

## 6. Definition of Done (feature)

The [Product Definition of Done](../sprint-1/README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test
- [ ] TDD evidence: a failing test commit, then a passing implementation commit
- [ ] The whole regression of Sprint 1 and F-06 passes on the same commit

## 7. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | |
