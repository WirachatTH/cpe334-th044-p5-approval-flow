# F-10: Product hardening (engineering contract)

> **Project Deliverable 2, Part C** (a Sprint 3 feature, specified in Sprint 2). Write and commit this contract
> (`docs(F-10): ...`) **before** any test or implementation commit for this feature. Revisions stay visible: add a
> version-history row for every change. Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-10 |
| Sprint | 3 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | NFR-12, NFR-13, NFR-14; NFR-02, NFR-04, NFR-05, NFR-06, NFR-11, NFR-15 |
| GitHub Issue | #84 (the sign-out part also closes #74) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-01 to F-09 (it verifies the finished product; paging of F-08 slice 3 comes before the timing run) |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-28 | Menelaus122 | First complete draft; proposes the answer to Q-08 and takes in the UAT findings X-01 and X-03 | Issue #84 | |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-10 brings the finished product to its quality targets. It has six parts.

| Part | Content | Source |
|---|---|---|
| A | Accessibility: no serious or critical WCAG 2.1 AA violation on any main screen | NFR-12 |
| B | Layout at phone, tablet, and desktop sizes, including a long title without spaces | NFR-13, UAT finding X-01 |
| C | A timed run of the common operations on the deployed service | NFR-14 |
| D | A sign-in throttle shared by all instances | Q-08, D-10 |
| E | An error page for a failure of the screen itself | NFR-06 |
| F | Signing out in one tab clears the other tabs | UAT finding X-03 (#74) |

**Main screens:** Login; My Requests; New Request; Request Detail (with the decision panel, with the resubmit form,
and waiting for the second approval); Review Inbox; Decided (F-08 slice 2); Summary (F-09); Not available.

**Q-08, proposed:** the failed sign-ins are counted in PostgreSQL, so that every instance sees the same count and a
restart keeps it (D-17). The limits of NFR-05 and the answers of F-01 do not change.

### 1.2 Workflow and state transitions

No change to the request workflow. A sign-in attempt goes: reserve → check the password → record the outcome.

| Step | Shared store |
|---|---|
| Reserve | In one transaction that holds a lock for the e-mail: count its rows of the last 15 minutes; with 5, refuse; otherwise add one |
| Failure | The reserved row stays |
| Success | The rows of that e-mail are removed |
| Neither (for example a server error) | The reserved row is removed |

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| NFR-05: after 5 failures within 15 minutes, `429` | The transaction of §1.2 (server, DB) |
| Unknown and known e-mails are counted alike (F-01) | The key is the normalised e-mail, with no lookup of the account |
| NFR-02: no change of any permission | The regression run |

### 1.4 Validation

No new input.

### 1.5 Failure and boundary cases

- **Attempts at the same moment on two instances:** the lock lets only 5 through.
- **An instance that stops during an attempt:** its reservation counts until it is 15 minutes old.
- **The database is unreachable at sign-in:** `500` with the fixed message; nobody is signed in.
- **Exactly 15 minutes** after the oldest failure: allowed again (AC-F01-08).
- **Old rows** are removed when an e-mail is next used.
- **Rollback:** the new table is only added, so the previous image keeps working with its own in-memory count.
- **Known limitations:** accessibility is checked by an automated scan and a keyboard run, not by a screen-reader user;
  the timing run measures one region on a warm instance.

### 1.6 Permissions

No change. The throttle applies before authentication.

### 1.7 Dependencies

- **F-01:** the throttle changes its store; `AC-F01-07`, `-08`, `-16`, and `-20` still hold.
- **F-08 slice 3:** paged lists, needed for the timing run.
- **F-09:** its screen is part of parts A and B.
- A development dependency for the scan: `@axe-core/playwright`.

## 2. Layer specifications

### 2.1 UI

| Screen / element | Behaviour |
|---|---|
| Every main screen | Fixes for what the scan and the layout checks find; no change of wording or workflow |
| Long text | A title or description without spaces wraps inside its cell or block at every size |
| Wide tables on a phone | Rows stay readable without scrolling the page sideways |
| Error page | If the screen fails while rendering: heading "Something went wrong", the text "Please reload the page.", and a **Reload** button; no technical detail |
| Sign-out in another tab | A tab that gets focus, or is told of a sign-out, asks who the user is; without a session it shows Login and removes private data |

### 2.2 API

| Method | Path | Change |
|---|---|---|
| `POST` | `/api/auth/login` | Same answers as F-01; the count is shared |

### 2.3 Data

Additive migration `add_login_attempt`: table `login_attempt` (`id`, `email_key` text, not null; `attempted_at`
timestamptz, not null, default now) with an index on (`email_key`, `attempted_at`). It holds no password and no
address.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F10-01 | Each main screen with data, as the roles that may see it | It is scanned for WCAG 2.1 AA | 0 serious and 0 critical violations | normal | NFR-12 |
| AC-F10-02 | The running stack | Return, resubmission, second approval, filters, and summary are used with the keyboard only | Every action can be done and the focus stays visible | normal | NFR-11, NFR-12 |
| AC-F10-03 | Each main screen | It is shown at 390 × 844, 820 × 1180, and 1440 × 900 | No horizontal page scroll and no clipped control | boundary | NFR-13 |
| AC-F10-04 | A request with a title of 120 characters without spaces | The lists and Request Detail are shown at the three sizes | The title wraps; no horizontal page scroll | boundary | NFR-13 |
| AC-F10-05 | The deployed service, warm, with 1,000 requests | 50 calls each of list, detail, submit, and decision | The 95th percentile of each is below 500 ms | normal | NFR-14 |
| AC-F10-06 | Two application instances on one database | 5 wrong passwords for one e-mail, spread over both, then the correct one | The 6th answers `429` with `Retry-After`; another account signs in | negative | NFR-05 |
| AC-F10-07 | 5 failures | The application is restarted; the correct password is sent | Still `429`; after 15 minutes it signs in | boundary | NFR-05 |
| AC-F10-08 | Two instances | 20 wrong sign-ins for one e-mail arrive at the same time, spread over both | Exactly 5 answer `401` and 15 `429`; no session | boundary | NFR-05 |
| AC-F10-09 | A screen that throws while rendering | It is shown | The error page with **Reload**; no technical detail | negative | NFR-06, NFR-11 |
| AC-F10-10 | A user signed in on two tabs | They log out in one and return to the other | The other shows Login and none of the private data | negative | NFR-04 |
| AC-F10-11 | The release candidate | The whole automated regression runs | Every earlier AC passes; none is skipped | normal | NFR-02, NFR-15 |

## 4. Software Test Specification (STS)

Server files are in `server/tests/sprint-3/`, client files in `client/tests/sprint-3/` and `client/e2e/sprint-3/`.

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-F10-01 | AC-F10-01 | e2e (axe) | Seeded stack with data | Scan each screen | As the AC | `accessibility.spec.ts` |
| TEST-F10-02 | AC-F10-02 | e2e | Seeded stack | Keyboard journeys | As the AC | `keyboard.spec.ts` |
| TEST-F10-03 | AC-F10-03 | e2e | Three viewports | Compare page and viewport widths; controls visible | As the AC | `layout.spec.ts` |
| TEST-F10-04 | AC-F10-04 | e2e | The long title | The same checks | As the AC | `layout.spec.ts` |
| TEST-F10-05 | AC-F10-05 | scripted measurement | Deployed service; a team member supplies the password | Run the script; keep its output | As the AC | `deploy/timing_check.py` |
| TEST-F10-06 | AC-F10-06 | API-DB | Two apps, one schema | The calls | As the AC | `throttle-shared.api.test.ts` |
| TEST-F10-07 | AC-F10-07 | API-DB | A new app on the same schema; times set in the rows | The calls | As the AC | `throttle-shared.api.test.ts` |
| TEST-F10-08 | AC-F10-08 | API-DB (concurrency) | Two apps | `Promise.all` | As the AC | `throttle-shared.api.test.ts` |
| TEST-F10-09 | AC-F10-09 | component | A route that throws | Render | As the AC | `ErrorPage.test.tsx` |
| TEST-F10-10 | AC-F10-10 | e2e | Two pages in one browser context | Log out, focus the other | As the AC | `sign-out-tabs.spec.ts` |
| TEST-F10-11 | AC-F10-11 | CI and release run | The candidate commit | All suites | Counts recorded; 0 failed, 0 skipped | `docs/traceability.md` |

**Coverage check:** every AC above maps to one TEST with the same number. `TEST-F10-05` is a measurement, not a test of
CI, because it needs the deployed service.

**Earlier tests that must change.** `TEST-F01-08` tests the in-memory class; its three scenarios are kept against the
shared store. No assertion is removed or loosened.

## 5. Definition of Done (feature)

The [Product Definition of Done](../sprint-1/README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test or the recorded measurement
- [ ] TDD evidence: a failing test commit, then a passing implementation commit, for parts B, D, E, and F
- [ ] The scan, layout, and timing results are kept with the release evidence

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | |
