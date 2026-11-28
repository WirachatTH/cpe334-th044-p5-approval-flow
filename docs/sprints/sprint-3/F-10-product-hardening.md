# F-10: Product hardening (engineering contract)

> **Project Deliverable 2, Part C** (a Sprint 3 feature, specified in Sprint 2). Write and commit this contract
> (`docs(F-10): ...`) **before** any test or implementation commit for this feature. Revisions stay visible: add a
> version-history row for every change. Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-10 |
| Sprint | 3 |
| Status | Agreed at v0.2 (review of PR #85); not implemented (Draft → Agreed → Implemented → Verified) |
| Linked requirements | NFR-12, NFR-13, NFR-14; NFR-02, NFR-04, NFR-05, NFR-06, NFR-11, NFR-15 |
| GitHub Issue | #84 (the sign-out part also closes #74) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-01 to F-09 (it verifies the finished product; paging of F-08 slice 3 comes before the timing run) |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-28 | Menelaus122 | First complete draft; proposes the answer to Q-08 and takes in the UAT findings X-01 and X-03 | Issue #84 | |
| 0.2 | 2026-11-29 | Menelaus122 | The shared table tells a reservation from a failure, and a success removes only the failures and its own row (§1.2, §2.3, new `AC-F10-12`); `403 ACCOUNT_INACTIVE` is not counted; expired rows of every e-mail are removed (§1.5, `AC-F10-07`); another tab also removes the data when another user has signed in (§2.1, `AC-F10-10`); the long description and decision reason are in `AC-F10-04`; the timing run uses its own service and database (`AC-F10-05`); Q-08 is decided. | Review of PR #85 | #85 |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-10 brings the finished product to its quality targets. It has six parts.

| Part | Content | Source |
|---|---|---|
| A | Accessibility: no serious or critical WCAG 2.1 AA violation on any main screen | NFR-12 |
| B | Layout at phone, tablet, and desktop sizes, including a long title without spaces | NFR-13, UAT finding X-01 |
| C | A timed run of the common operations on a deployed service that has its own database | NFR-14 |
| D | A sign-in throttle shared by all instances | Q-08, D-10 |
| E | An error page for a failure of the screen itself | NFR-06 |
| F | Signing out in one tab clears the other tabs, also when another user then signs in | UAT finding X-03 (#74) |

**Main screens:** Login; My Requests; New Request; Request Detail (with the decision panel, with the resubmit form,
and waiting for the second approval); Review Inbox; Decided (F-08 slice 2); Summary (F-09); Not available.

**Q-08, decided:** the failed sign-ins are counted in PostgreSQL, so that every instance sees the same count and a
restart keeps it (D-17). The limits of NFR-05 and the answers of F-01 do not change.

### 1.2 Workflow and state transitions

No change to the request workflow. A sign-in attempt goes: reserve → check the password → record the outcome. Each
attempt has its own row, which is a **reservation** while the password is being checked and a **failure** after a
wrong one.

| Step | Shared store |
|---|---|
| Reserve | In one transaction that holds a lock for the e-mail: remove the expired rows (§1.5); count the rows of this e-mail, reservations and failures; with 5, refuse; otherwise add a reservation |
| Failure | The attempt's own row becomes a failure, and its time is the time of the failure, so the window runs from there as in F-01 |
| Success | The failures of that e-mail and the attempt's own row are removed. Reservations of other attempts stay, and each records its own outcome |
| Neither (a server error, or `403 ACCOUNT_INACTIVE`, which F-01 does not count) | The attempt's own row is removed |

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
- **A success while other attempts are in progress:** their reservations stay, so a failure among them is counted
  (`AC-F10-12`), as today.
- **The database is unreachable at sign-in:** `500` with the fixed message; nobody is signed in.
- **Exactly 15 minutes** after the oldest failure: allowed again (AC-F01-08).
- **Expired rows** (a time 15 minutes old or older) of **every** e-mail are removed at each reservation, through the
  index on `attempted_at`. Sign-in is public, so rows of e-mails that never return must not stay.
- **Rollback:** the new table is only added, so the previous image keeps working with its own in-memory count.
- **Timing run data:** the run creates requests and decisions, so it does not use the demo database that others use. A
  team member creates a temporary database on the same Cloud SQL instance and a temporary service from the release
  image, and removes both after the run.
- **Known limitations:** accessibility is checked by an automated scan and a keyboard run, not by a screen-reader user;
  the timing run measures one region on a warm instance. The table has no cap on the number of e-mails within one window
  (today the memory keeps at most 10,000); a row is small and lives for 15 minutes.

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
| Long text | A title, description, or decision reason without spaces wraps inside its cell or block at every size |
| Wide tables on a phone | Rows stay readable without scrolling the page sideways |
| Error page | If the screen fails while rendering: heading "Something went wrong", the text "Please reload the page.", and a **Reload** button; no technical detail |
| Sign-out in another tab | A tab that gets focus, or is told of a sign-out, asks who the user is. Without a session it shows Login. If another user has signed in, it shows that user's start page. In both cases it first removes everything it loaded for the earlier user |

### 2.2 API

| Method | Path | Change |
|---|---|---|
| `POST` | `/api/auth/login` | Same answers as F-01; the count is shared |

### 2.3 Data

Additive migration `add_login_attempt`: table `login_attempt` (`id`; `email_key` text, not null; `failed` boolean,
not null, default false: false is a reservation, true a failure; `attempted_at` timestamptz, not null, default now: the
time of the reservation, replaced by the time of the failure) with an index on (`email_key`, `attempted_at`) and one on
(`attempted_at`). It holds no password and no address.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F10-01 | Each main screen with data, as the roles that may see it | It is scanned for WCAG 2.1 AA | 0 serious and 0 critical violations | normal | NFR-12 |
| AC-F10-02 | The running stack | Return, resubmission, second approval, filters, and summary are used with the keyboard only | Every action can be done and the focus stays visible | normal | NFR-11, NFR-12 |
| AC-F10-03 | Each main screen | It is shown at 390 × 844, 820 × 1180, and 1440 × 900 | No horizontal page scroll and no clipped control | boundary | NFR-13 |
| AC-F10-04 | A decided request whose title (120 characters), description, and decision reason are long and without spaces | The lists and Request Detail are shown at the three sizes | Each text wraps; no horizontal page scroll | boundary | NFR-13 |
| AC-F10-05 | A temporary service from the release image with its own database, warm, holding 1,000 synthetic requests that the script created through the API | 50 calls each of list, detail, submit, and decision | The 95th percentile of each is below 500 ms; the demo database is not written to | normal | NFR-14 |
| AC-F10-06 | Two application instances on one database | 5 wrong passwords for one e-mail, spread over both, then the correct one | The 6th answers `429` with `Retry-After`; another account signs in | negative | NFR-05 |
| AC-F10-07 | 5 failures for one e-mail, and expired rows of another | The application is restarted; the correct password is sent | Still `429`; after 15 minutes it signs in, and no expired row of any e-mail is left | boundary | NFR-05 |
| AC-F10-08 | Two instances | 20 wrong sign-ins for one e-mail arrive at the same time, spread over both | Exactly 5 answer `401` and 15 `429`; no session | boundary | NFR-05 |
| AC-F10-09 | A screen that throws while rendering | It is shown | The error page with **Reload**; no technical detail | negative | NFR-06, NFR-11 |
| AC-F10-10 | A user signed in on two tabs | They log out in one and return to the other; or they log out, another user signs in, and the first tab gets focus | Without a session the first tab shows Login, and with another user it shows that user's start page; in both cases none of the earlier user's private data | negative | NFR-04 |
| AC-F10-11 | The release candidate | The whole automated regression runs | Every earlier AC passes; none is skipped | normal | NFR-02, NFR-15 |
| AC-F10-12 | Three failures for one e-mail and a fourth attempt still being checked, on two instances | The correct password succeeds; then the fourth attempt fails; then five more wrong passwords are sent | The earlier failures are gone and the fourth counts: four of the five answer `401`, the fifth `429` | boundary | NFR-05 |

## 4. Software Test Specification (STS)

Server files are in `server/tests/sprint-3/`, client files in `client/tests/sprint-3/` and `client/e2e/sprint-3/`.

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-F10-01 | AC-F10-01 | e2e (axe) | Seeded stack with data | Scan each screen | As the AC | `accessibility.spec.ts` |
| TEST-F10-02 | AC-F10-02 | e2e | Seeded stack | Keyboard journeys | As the AC | `keyboard.spec.ts` |
| TEST-F10-03 | AC-F10-03 | e2e | Three viewports | Compare page and viewport widths; controls visible | As the AC | `layout.spec.ts` |
| TEST-F10-04 | AC-F10-04 | e2e | The long texts | The same checks | As the AC | `layout.spec.ts` |
| TEST-F10-05 | AC-F10-05 | scripted measurement | The temporary service; a team member runs the cloud commands and supplies its password | Create the data and time the calls with the script; keep its output | As the AC | `deploy/timing_check.py` |
| TEST-F10-06 | AC-F10-06 | API-DB | Two apps, one schema | The calls | As the AC | `throttle-shared.api.test.ts` |
| TEST-F10-07 | AC-F10-07 | API-DB | A new app on the same schema; times set in the rows, some for a second e-mail | The calls | As the AC | `throttle-shared.api.test.ts` |
| TEST-F10-08 | AC-F10-08 | API-DB (concurrency) | Two apps | `Promise.all` | As the AC | `throttle-shared.api.test.ts` |
| TEST-F10-09 | AC-F10-09 | component | A route that throws | Render | As the AC | `ErrorPage.test.tsx` |
| TEST-F10-10 | AC-F10-10 | e2e | Two pages in one browser context | Log out and focus the other; sign in as another user and focus the first | As the AC | `sign-out-tabs.spec.ts` |
| TEST-F10-11 | AC-F10-11 | CI and release run | The candidate commit | All suites | Counts recorded; 0 failed, 0 skipped | `docs/traceability.md` |
| TEST-F10-12 | AC-F10-12 | API-DB (concurrency) | Two apps; the test holds the password check of one attempt open | The calls in that order | As the AC | `throttle-shared.api.test.ts` |

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
