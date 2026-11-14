# F-01: Authentication (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-01): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-01 |
| Sprint | 1 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-01, FR-02, FR-03; BR-02; NFR-01, NFR-03, NFR-04, NFR-05, NFR-06 |
| GitHub Issue | #7 (contract), #9 (implementation) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-05 (`User`, `Session`, seed, `createApp({ prisma, config })`). F-02 enforces access with the session this feature creates. SDS §7. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure | #13 |
| 0.2 | 2026-11-14 | Menelaus122 | First complete draft | Issue #7 (F-01 part) | this PR |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-01 gives every user a real identity:
- sign in with email and password (FR-01)
- stay signed in across reloads for the session lifetime (FR-03)
- sign out so that the session is over on the server, not only in the browser (FR-02)

It adapts TokTickIT's `password.ts`, `session.ts`, `loginThrottle.ts`, and auth routes (`main` @ `0f01560`). It drops the forced password change, the password-change endpoint, and the separate `/api/auth/session` check, which Sprint 1 does not need.

### 1.2 Workflow

**Sign in** (`POST /api/auth/login`):
1. F-02 runs first: the origin guard, and the route policy (`public`).
2. Read and validate the body (§1.4). A validation error answers `400` and is **not** counted by the throttle.
3. Normalise the email (trim, lowercase) and **reserve** an attempt with the throttle. If the email already has 5 failures in the last 15 minutes, answer `429 TOO_MANY_ATTEMPTS` with `Retry-After`, without checking the password.
4. Find the user by email and verify the password with `verifyPasswordForLogin`. For an unknown email, this still runs one scrypt against a dummy hash, so timing does not reveal which emails exist.
5. Act on the outcome, and report it to the throttle:
   - wrong password or unknown email → `401 INVALID_CREDENTIALS` (counts as a failure)
   - correct password on an inactive account → `403 ACCOUNT_INACTIVE` (not counted)
   - correct password on an active account → success, which clears this email's failures
6. On success:
   1. Delete this user's expired sessions.
   2. Create a session: 32 random bytes as the token, its SHA-256 stored, expiry now + 8 hours.
   3. Set the `af_session` cookie and answer `200 { user }`.

**Current user** (`GET /api/auth/me`): F-02 has already attached the session's user. The handler answers `200 { user }`.

**Session lookup** (the `attachSession` middleware, used by F-02): hash the cookie token and find the session.
- No row → no session.
- Expired row → delete it, no session.
- Inactive user → no session.

**Sign out** (`POST /api/auth/logout`): if the cookie matches a session, delete that row. Always clear the cookie and answer `204`, with or without a session.

**Client:**
- On load, the SPA calls `/api/auth/me` and shows "Checking your session…" while it waits. A `200` opens the app; a `401` shows Login.
- After sign-in it opens the role's home: Review Inbox (`/reviews`) for a reviewer, My Requests (`/requests`) for a requester.
- A `401` from any protected call while the app is open sends the user to Login with "Your session has ended. Please log in again."

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| Identity and role come only from the server-side session (BR-02) | `attachSession` resolves the user from the cookie token's hash. No header or body field sets the user (server; tested in F-02). |
| Passwords are verified against salted scrypt hashes and never returned (NFR-03) | `verifyPasswordForLogin`, constant-time comparison; the user shape never includes `passwordHash` (server) |
| One message for an unknown email or a wrong password (no account enumeration) | Same status, code, and message for both; dummy-hash verification for unknown emails (server) |
| The session is protected and expires after 8 hours (NFR-04) | Cookie attributes and `expires_at`; expiry checked on every request (server, DB) |
| Sign-out ends the session on the server (FR-02, NFR-04) | The session row is deleted, so the old cookie is useless even if it is kept (server, DB) |
| At most 5 failed sign-ins per email per 15 minutes (NFR-05) | `LoginThrottle` with reservation before the password check (server, process memory: SRS D-10) |

### 1.4 Validation

| Field / input | Rule | Error returned |
|---|---|---|
| Body | A JSON object | `400 VALIDATION_ERROR` "Some fields need attention." with no `fields` |
| `email` | A string; after trimming, 1–254 characters | `400 VALIDATION_ERROR`, `fields.email`: "Enter your email address." (missing or blank) or "Email address is too long." |
| `password` | A string of 1–128 characters; not trimmed | `400 VALIDATION_ERROR`, `fields.password`: "Enter your password." (missing or empty) or "Password is too long." |

The email format is not otherwise checked: an address that is not on file simply fails as `INVALID_CREDENTIALS`.

### 1.5 Failure and boundary cases

- **The 5th failure, then a correct password:** the 6th attempt answers `429`, even with the right password, until the oldest failure is more than 15 minutes old.
- **A success inside the window** clears the count for that email. Failures for other emails are unaffected.
- **Burst of simultaneous wrong attempts:** attempts are reserved before the password check, so no more than 5 pass the limit.
- **Session expires while the app is open:** the next protected call answers `401`, and the client goes to Login with the "session has ended" message.
- **Account deactivated while signed in** (only possible in the database in Sprint 1): the next request finds no usable session and answers `401`.
- **Sign-out request fails on the network:** the client shows "Could not sign out. Please try again." and stays signed in, because the server session still exists.
- **Several sessions per user** (two browsers) are allowed. Signing out ends only the session whose cookie was sent.
- **Restart of a Cloud Run instance:** sessions survive because they are in the database. Throttle counts on that instance are lost (SRS D-10).

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| `POST /api/auth/login` | ✅ | ✅ | ✅ | — |
| `GET /api/auth/me` | ✅ | ✅ | ❌ `401` | Own user only |
| `POST /api/auth/logout` | ✅ | ✅ | ✅ (`204`, nothing to delete) | Own session only (the one in the cookie) |

### 1.7 Dependencies

- **F-05:** the `User` and `Session` tables, the seeded accounts, `password.ts`, and `createApp({ prisma, config })`.
- **F-02:** the origin guard, `attachSession` placement, and the route policy (`public` login, `optional` logout, `any` for `/me`).
- **Testability:** `LoginThrottle.beginAttempt(email, now)` and `endAttempt(email, outcome, now)` take the time as an argument, so the window is tested without waiting.

## 2. Layer specifications

### 2.1 UI

| Element | Behaviour |
|---|---|
| Login screen (`/login`) | Product name; fields **Email** and **Password** (type `password`); button **Sign in**. If the user is already signed in, it redirects to the role's home. |
| Client validation | A blank email or password shows "Enter your email address." / "Enter your password." beneath the field, linked with `aria-describedby`; focus moves to the first invalid field; no request is sent. |
| Busy state | While the request is in flight the button reads "Signing in…" and is disabled. |
| Failure messages | `401`: "Email or password is incorrect." The email is kept and the password field is cleared. `429`: "Too many sign-in attempts. Try again in N minutes." (N = `Retry-After` ÷ 60, rounded up). `403 ACCOUNT_INACTIVE`: "This account is inactive." `500` or network: "Something went wrong. Please try again." |
| Session check on load | A full-page "Checking your session…" with a spinner, until `/api/auth/me` answers. |
| Header (all app screens) | The user's name and a role badge (`Requester` / `Reviewer`), and a **Log out** button. |
| Session ended | Login shows the notice "Your session has ended. Please log in again." |

### 2.2 API

| Method | Path | Auth / role | Request | Success | Errors |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | public | `{ "email": string, "password": string }` | `200 { "user": User }` plus `Set-Cookie` | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_INACTIVE`, `403 FORBIDDEN_ORIGIN` (F-02), `429 TOO_MANY_ATTEMPTS` with `Retry-After`, `500 INTERNAL_ERROR` |
| `GET` | `/api/auth/me` | any signed-in user | none | `200 { "user": User }` | `401 UNAUTHENTICATED`, `500` |
| `POST` | `/api/auth/logout` | with or without a session | none | `204`, with a clearing `Set-Cookie` | `403 FORBIDDEN_ORIGIN` (F-02), `500` |

`User` = `{ "id": 3, "name": "Mint Chaiyaporn", "email": "mint.reviewer@example.com", "role": "REVIEWER" }`.
No auth response contains `passwordHash`, a session token, or a token hash.

**Cookie on sign-in:** `af_session=<token>; Path=/api; Max-Age=28800; HttpOnly; SameSite=Strict`, plus `Secure` when
`NODE_ENV=production`. **On sign-out:** `af_session=; Path=/api; Max-Age=0; HttpOnly; SameSite=Strict`.

**Examples:**

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }
{ "error": { "code": "TOO_MANY_ATTEMPTS", "message": "Too many sign-in attempts. Please try again later." } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields need attention.", "fields": { "password": "Enter your password." } } }
```

### 2.3 Data

No change. F-01 uses the `User` and `Session` tables created by F-05's `init_identity` migration. A session row is
created on sign-in, deleted on sign-out, and deleted when found expired.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F01-01 | Each seeded account (one requester, one reviewer) | It signs in with the correct email and password | `200 { user }` with `id`, `name`, `email`, `role` only. `Set-Cookie` has `af_session` with `HttpOnly`, `SameSite=Strict`, `Path=/api`, `Max-Age=28800`. One new session row exists whose `token_hash` is the SHA-256 of the cookie token (not the token itself) and whose `expires_at` is 8 hours ahead (±1 minute). | normal | FR-01, NFR-03, NFR-04 |
| AC-F01-02 | A seeded requester | It signs in with its email in another case and with surrounding spaces (`"  PLOY.Requester@Example.COM "`) | `200`, and the same user as AC-F01-01 | boundary | FR-01 |
| AC-F01-03 | A seeded account | It signs in with a wrong password | `401 INVALID_CREDENTIALS`, message "Email or password is incorrect."; no `Set-Cookie`; the session count is unchanged | negative | FR-01 |
| AC-F01-04 | No account with this email | It signs in | Exactly the same status, code, and message as AC-F01-03; no session is created | negative | FR-01, NFR-06 |
| AC-F01-05 | Any client | It sends each invalid body: missing email, email of spaces, missing password, empty password, a 255-character email, a 129-character password, a JSON array | `400 VALIDATION_ERROR`. The `fields` key names the bad field (none for the array). After seven such requests for one email, a correct sign-in for it still succeeds, because validation errors are not counted. | negative | FR-01, NFR-05 |
| AC-F01-06 | An account set inactive in the database | It signs in with the correct password, then with a wrong one | First `403 ACCOUNT_INACTIVE`, then `401 INVALID_CREDENTIALS`; no session either time | negative | BR-02 |
| AC-F01-07 | A seeded account | 5 wrong passwords, then the correct password, then a different seeded account signs in | The 6th request answers `429 TOO_MANY_ATTEMPTS` with an integer `Retry-After` from 1 to 900 and creates no session; the other account signs in with `200` | negative | NFR-05 |
| AC-F01-08 | The throttle with a controlled clock | (a) 5 failures, then the clock moves 15 minutes past the first; (b) 4 failures, then a success, then 5 more failures; (c) failures for an unknown email | (a) the next attempt is allowed. (b) The 5th of the new failures is allowed and the 6th is refused, because the success cleared the count. (c) An unknown email is refused after 5 failures, like a known one. | boundary | NFR-05 |
| AC-F01-09 | A signed-in account | `GET /api/auth/me` with its cookie, without a cookie, and with a made-up token | `200 { user }` equal to the sign-in response; `401 UNAUTHENTICATED`; `401 UNAUTHENTICATED` | normal / negative | FR-03, NFR-01 |
| AC-F01-10 | A session whose `expires_at` is 1 second in the past | `GET /api/auth/me` with its cookie | `401 UNAUTHENTICATED`, and the session row has been deleted | boundary | NFR-04 |
| AC-F01-11 | A signed-in account that is then set inactive in the database | `GET /api/auth/me` with its cookie | `401 UNAUTHENTICATED` | negative | NFR-04 |
| AC-F01-12 | A signed-in account | `POST /api/auth/logout`, then `GET /api/auth/me` with the old cookie | `204` with a clearing `Set-Cookie` (`Max-Age=0`, `Path=/api`); the session row is gone; the old cookie gets `401` | normal | FR-02, NFR-04 |
| AC-F01-13 | No session | `POST /api/auth/logout` | `204`, no error | boundary | FR-02 |
| AC-F01-14 | The Login screen | A requester and then a reviewer sign in with valid credentials | The requester lands on My Requests (`/requests`) and the reviewer on Review Inbox (`/reviews`); the header shows each one's name and role | normal | FR-01 |
| AC-F01-15 | The Login screen | (a) Sign in with both fields blank; (b) sign in with a wrong password (API answers `401`); (c) sign in while the response is delayed | (a) Both messages appear beneath their fields, linked with `aria-describedby`; focus is on Email; no request is sent. (b) "Email or password is incorrect." is shown; the email is kept and the password is cleared. (c) The button reads "Signing in…" and is disabled, and a second click sends nothing. | negative | FR-01, NFR-11 |
| AC-F01-16 | The Login screen | The API answers `429` with `Retry-After: 600`, then `403 ACCOUNT_INACTIVE` | "Too many sign-in attempts. Try again in 10 minutes." then "This account is inactive." | negative | NFR-05 |
| AC-F01-17 | A signed-in user on My Requests | The page is reloaded | The user is still signed in and on My Requests | normal | FR-03 |
| AC-F01-18 | A signed-in user | They click **Log out**, then open `/requests` directly | Login is shown both times, and no request data appears | normal | FR-02 |
| AC-F01-19 | A signed-in user | A protected API call answers `401` | The app shows Login with "Your session has ended. Please log in again." | negative | FR-03, NFR-04 |

## 4. Software Test Specification (STS)

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File / test name |
|---|---|---|---|---|---|---|
| TEST-F01-01 | AC-F01-01 | API-DB | Seeded test database; synthetic seed password | `POST /api/auth/login` for the requester, then the reviewer | Status, body keys exactly `id,name,email,role`; cookie attributes as stated; `Session` row count +1; `token_hash === sha256(token)`; `expires_at` within now + 8 h ± 60 s | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-02 | AC-F01-02 | API-DB | As above | Sign in with `"  PLOY.Requester@Example.COM "` | `200`, `user.id` equals the requester's id | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-03 | AC-F01-03 | API-DB | As above | Wrong password | `401`, code and message as stated; no `set-cookie` header; session count unchanged | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-04 | AC-F01-04 | API-DB | As above | Sign in as `nobody@example.com` | Status, code, and message deep-equal TEST-F01-03's; session count unchanged | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-05 | AC-F01-05 | API-DB | As above; throttle reset | Send the seven invalid bodies (table-driven), then a correct sign-in for the same email | Each `400 VALIDATION_ERROR` with the stated `fields`; the final sign-in `200` | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-06 | AC-F01-06 | API-DB | A seeded requester updated to `is_active = false` in the test | Correct password, then wrong password | `403 ACCOUNT_INACTIVE`, then `401 INVALID_CREDENTIALS`; session count unchanged | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-07 | AC-F01-07 | API-DB | Throttle reset | 5 wrong, 1 correct for the requester; then the reviewer signs in | 6th: `429`, `retry-after` parses to an integer in 1–900, no session; reviewer `200` | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-08 | AC-F01-08 | unit | A new `LoginThrottle`; explicit `now` values | Run scenarios (a), (b), (c) through `beginAttempt` / `endAttempt` | `allowed` values as stated in each scenario | `server/tests/sprint-1/login-throttle.test.ts` |
| TEST-F01-09 | AC-F01-09 | API-DB | A signed-in agent | `GET /api/auth/me` with the cookie, with none, with `af_session=made-up` | `200` with the sign-in user; `401`; `401` | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-10 | AC-F01-10 | API-DB | Sign in, then set that session's `expires_at` to now − 1 s | `GET /api/auth/me` | `401`; the row no longer exists | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-11 | AC-F01-11 | API-DB | Sign in, then set the user `is_active = false` | `GET /api/auth/me` | `401` | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-12 | AC-F01-12 | API-DB | A signed-in agent; keep the cookie value | Logout, then `/me` with the kept cookie | `204` with `Max-Age=0; Path=/api`; row deleted; `/me` `401` | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-13 | AC-F01-13 | API | No cookie | `POST /api/auth/logout` | `204` | `server/tests/sprint-1/auth.api.test.ts` |
| TEST-F01-14 | AC-F01-14 | component | Mocked API: login returns a requester, then a reviewer | Fill and submit the Login form for each | The router location is `/requests`, then `/reviews`; the header text includes the name and role | `client/tests/sprint-1/Login.test.tsx` |
| TEST-F01-15 | AC-F01-15 | component | Mocked API: `401` for (b), a pending promise for (c) | Run (a), (b), (c) | As stated, including `aria-describedby` linkage, focus, the fetch spy call counts, and the disabled button | `client/tests/sprint-1/Login.test.tsx` |
| TEST-F01-16 | AC-F01-16 | component | Mocked API: `429` with `Retry-After: 600`, then `403 ACCOUNT_INACTIVE` | Submit twice | The two messages appear exactly as stated | `client/tests/sprint-1/Login.test.tsx` |
| TEST-F01-17 | AC-F01-17 | e2e | Running stack with seeded data | Sign in as the requester, reload `/requests` | Still on `/requests`, and the header shows the requester | `client/e2e/sprint-1/auth.spec.ts` |
| TEST-F01-18 | AC-F01-18 | e2e | As above | Log out; then `page.goto('/requests')` | Login is visible both times; no request row is rendered | `client/e2e/sprint-1/auth.spec.ts` |
| TEST-F01-19 | AC-F01-19 | component | Signed-in context; mocked protected call returns `401` | Trigger the call | Location is `/login` and the notice is shown | `client/tests/sprint-1/AuthFlow.test.tsx` |

**Coverage check:** AC-F01-01 to AC-F01-19 each map to exactly one TEST, and every test is automated.
- Thirteen are API-DB, API, or unit tests on the server, which carry the security evidence (NFR-01, 03, 04, 05, 06).
- Four are component tests and two are e2e tests, which cover the UI behaviour.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test
- [ ] TDD evidence recorded: failing test commit, then passing implementation commit (shared with F-02 in #9)
- [ ] No auth response, log line, or error contains a password, hash, token, or token hash (checked in review)

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | The throttle is per process (SRS D-10). Signing out ends one session, not all of a user's sessions. |
