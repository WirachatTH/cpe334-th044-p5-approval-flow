# F-02: Role-based access control (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-02): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-02 |
| Sprint | 1 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-10; BR-01, BR-02, BR-09 (role part); NFR-01, NFR-02, NFR-06 |
| GitHub Issue | #7 (contract), #9 (implementation) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | F-01 (session and current user), F-05 (`createApp`, `CLIENT_ORIGINS`). F-03 and F-04 add record-scope checks on top of this feature. SDS §2, §5, §6. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure | #13 |
| 0.2 | 2026-11-14 | Menelaus122 | First complete draft | Issue #7 (F-02 part) | this PR |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-02 is the single place where the API decides **who may call which route**. The decision uses only the
server-side session, never anything the client claims.
- Every route is listed in one route-policy table, and one middleware applies it before any handler runs, so a route without a policy cannot be reached.
- The UI shows each role only the navigation it can use (FR-10), but that is a convenience: the API enforces the same rules even when a hidden screen or a forged request calls it directly (NFR-02).

Record scope (a requester sees only their own requests; a reviewer only their own and those assigned to them) is
the next check after F-02. It belongs to the handlers in F-03 and F-04, because it needs the request row.

Adapted from TokTickIT's `authorization.ts` and `rejectForeignOrigin` (`main` @ `0f01560`), with its three roles
reduced to `REQUESTER` and `REVIEWER` and without the password-change step.

### 1.2 Workflow

The middleware order in `createApp`, applied to every `/api` request:

1. **Origin guard** (`POST` only): if an `Origin` header is present and is not in `config.clientOrigins`, answer `403 FORBIDDEN_ORIGIN`. A request without an `Origin` header passes; `Origin: null` is refused.
2. **Attach session** (`attachSession`, from F-01): resolve the cookie to a user, or to none.
3. **Authorize** (one middleware, using `ROUTE_POLICIES`):
   1. Find the policy for the method and path. If there is none, answer `404 NOT_FOUND`, even for a signed-in user, and even before the session check.
   2. Apply the access kind:
      - `public`: no session needed.
      - `optional`: the session is used if present.
      - `roles`: no session → `401 UNAUTHENTICATED`; a role not in the list → `403 FORBIDDEN`.
4. **JSON body parsing**, only after step 3. A caller who may not use a route learns nothing by sending a body, and a malformed body on a forbidden route still answers `403`.
5. **The handler**, which then applies record scope (F-03, F-04), validation, and business rules.
6. **Error handler**: any unexpected error answers `500 INTERNAL_ERROR` with a fixed message. A malformed JSON body answers `400 VALIDATION_ERROR`. Neither includes internal details.

**Client:**
- The header navigation is built from the user's role.
- `RequireAuth` sends signed-out users to Login.
- `RequireRole` shows "This page is not available to you." for a route the role cannot use, without calling the API.

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| Request endpoints require a signed-in user (BR-01, NFR-01) | `roles` policies answer `401` without a session, before any handler (server) |
| The role used in checks comes only from the session (BR-02) | `authorize` reads `req.user.role`, set by `attachSession` from the database. Headers such as `X-Role` or `X-User-Id` and body fields are never read for identity (server). |
| A `REQUESTER` cannot use review operations (BR-09, role part; NFR-02) | `ROUTE_POLICIES` lists `/api/reviews/inbox` and `/api/requests/:id/decision` for `REVIEWER` only (server) |
| A route without a policy is unreachable | An unlisted method and path answer `404`. A test checks that every registered route has a policy (server). |
| Cross-site state changes are refused | Origin guard on `POST`, in addition to the `SameSite=Strict` cookie (server) |
| Errors never expose internals (NFR-06) | One error handler with fixed messages; body parsing after authorization (server) |
| Navigation shows only what the role can use (FR-10) | Navigation built from `user.role`; `RequireRole` on reviewer-only routes (client) |

### 1.4 Validation

F-02 validates no fields of its own. Its only input checks are these:

| Field / input | Rule | Error returned |
|---|---|---|
| `Origin` header on `POST` | Absent, or exactly one of `config.clientOrigins` | `403 FORBIDDEN_ORIGIN`: "This request came from a site that is not allowed." |
| Request body, on routes that read one | Readable JSON (parsed only after authorization) | `400 VALIDATION_ERROR`: "Some fields need attention.", with no parser text |

### 1.5 Failure and boundary cases

- **Guard order:**
  - A foreign `Origin` without a session answers `403 FORBIDDEN_ORIGIN`, not `401`.
  - No session on a reviewer-only route answers `401`, not `403`.
  - A requester sending a malformed body to a reviewer-only route answers `403`, not `400`.
- **Allowed role, handler not built yet:** policies for the F-03 and F-04 routes exist from #9. Until their handlers land, an allowed role gets `404`, while a wrong role already gets `403` and no session gets `401`. The guard is in place before the feature exists.
- **Forged identity:** a requester who sends `X-Role: REVIEWER` or `X-User-Id: <reviewer id>` is still a requester.
- **GET from a foreign origin:** not checked by the origin guard (it changes nothing). The cookie's `SameSite=Strict` keeps cross-site requests unauthenticated.
- **Session lookup fails** (database error): `500 INTERNAL_ERROR` with the fixed message, never `401`. A broken database must not look like "logged out".

### 1.6 Permissions

The route-policy table (`ROUTE_POLICIES`) for Sprint 1:

| Method | Path | Access | Requester | Reviewer | Unauthenticated | Handler from |
|---|---|---|---|---|---|---|
| `GET` | `/api/health` | public | ✅ | ✅ | ✅ | F-05 |
| `GET` | `/api/ready` | public | ✅ | ✅ | ✅ | F-05 |
| `POST` | `/api/auth/login` | public | ✅ | ✅ | ✅ | F-01 |
| `POST` | `/api/auth/logout` | optional | ✅ | ✅ | ✅ | F-01 |
| `GET` | `/api/auth/me` | roles: R, V | ✅ | ✅ | ❌ 401 | F-01 |
| `GET` | `/api/reviewers` | roles: R, V | ✅ | ✅ | ❌ 401 | F-03 |
| `POST` | `/api/requests` | roles: R, V | ✅ | ✅ | ❌ 401 | F-03 |
| `GET` | `/api/requests/mine` | roles: R, V | ✅ | ✅ | ❌ 401 | F-03 |
| `GET` | `/api/requests/:id` | roles: R, V | ✅ (own; scope in F-03) | ✅ (own or assigned) | ❌ 401 | F-03 |
| `GET` | `/api/reviews/inbox` | roles: V | ❌ 403 | ✅ | ❌ 401 | F-04 |
| `POST` | `/api/requests/:id/decision` | roles: V | ❌ 403 | ✅ (assigned; rules in F-04) | ❌ 401 | F-04 |

R = `REQUESTER`, V = `REVIEWER`. Any other method and path answers `404 NOT_FOUND`.

### 1.7 Dependencies

- **F-01:** `attachSession`, the session cookie, and the current-user shape.
- **F-05:** `createApp({ prisma, config })` and `config.clientOrigins` (`CLIENT_ORIGINS`). The test configuration uses `http://localhost:5173`.
- **Testability:**
  - `ROUTE_POLICIES` is exported, so tests iterate over it.
  - `createApp` exposes its Express router, so a test can list the registered routes.
  - A Prisma stub can make the session lookup throw (AC-F02-10).

## 2. Layer specifications

### 2.1 UI

| Element | Behaviour |
|---|---|
| Header navigation | Requester: **My Requests**, **New Request**. Reviewer: **Review Inbox**, **My Requests**, **New Request**. The current page is marked with `aria-current="page"`. |
| `RequireAuth` | Wraps every app route; signed out → `/login`. |
| `RequireRole(["REVIEWER"])` | Wraps `/reviews`. Any other role sees a page titled "Not available" with "This page is not available to you." and a link back to My Requests; the inbox endpoint is not called. |

### 2.2 API

F-02 adds no endpoint. It adds the policy table above and these responses, shared by every route:

| Situation | Response |
|---|---|
| No policy for method and path | `404 { "error": { "code": "NOT_FOUND", "message": "Not found." } }` |
| No session on a `roles` route | `401 { "error": { "code": "UNAUTHENTICATED", "message": "Please sign in." } }` |
| Role not allowed | `403 { "error": { "code": "FORBIDDEN", "message": "You do not have permission to do this." } }` |
| Foreign `Origin` on `POST` | `403 { "error": { "code": "FORBIDDEN_ORIGIN", "message": "This request came from a site that is not allowed." } }` |
| Malformed JSON body | `400 { "error": { "code": "VALIDATION_ERROR", "message": "Some fields need attention." } }` |
| Unexpected error | `500 { "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." } }` |

Each of these bodies contains only the `error` object: no request data, stack trace, SQL, or route list.

### 2.3 Data

No change.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F02-01 | No session | Each `roles` route in §1.6 is called (`/api/auth/me`, `/api/reviewers`, `POST /api/requests`, `/api/requests/mine`, `/api/requests/1`, `/api/reviews/inbox`, `POST /api/requests/1/decision`) | Each answers `401 UNAUTHENTICATED`, and the body has only the `error` key | negative | BR-01, NFR-01 |
| AC-F02-02 | No session | The `public` and `optional` routes are called (`/api/health`, `/api/ready`, `POST /api/auth/login` with a valid body, `POST /api/auth/logout`) | None answers `401` or `403`; logout answers `204` | normal | NFR-01 |
| AC-F02-03 | A signed-in requester | It calls `GET /api/reviews/inbox`, and `POST /api/requests/1/decision` with a valid body and then with a malformed JSON body | All three answer `403 FORBIDDEN` (the malformed body gets `403`, not `400`) | negative | BR-09, NFR-02 |
| AC-F02-04 | A signed-in user of each allowed role | Each route in §1.6 is called with that role | No call is answered `401` or `403` by the policy. A handler not built yet may answer `404`. | normal | NFR-02 |
| AC-F02-05 | A signed-in reviewer, and separately no session | It calls `DELETE /api/requests/1`, `PATCH /api/requests/1`, `GET /api/admin/users`, and `GET /api/nope` | Each answers `404 NOT_FOUND` with only the `error` key, signed in or not | negative | NFR-02, NFR-06 |
| AC-F02-06 | The app built by `createApp` | Its registered routes are compared with `ROUTE_POLICIES` | Every registered method and path has exactly one policy entry | normal | NFR-02 |
| AC-F02-07 | A signed-in requester, and separately no session | Requests carry `X-User-Id: <reviewer's id>`, `X-Role: REVIEWER`, and `X-Requester-Id: <reviewer's id>` | `/api/auth/me` still returns the requester, and the inbox still answers `403`. Without a session the same headers get `401`. | negative | BR-02, NFR-02 |
| AC-F02-08 | Test config `CLIENT_ORIGINS=http://localhost:5173` | `POST /api/auth/login` (correct credentials) is sent with `Origin: https://evil.example`, `Origin: null`, no `Origin`, and `Origin: http://localhost:5173`; then a signed-in user calls `POST /api/auth/logout` with `Origin: https://evil.example` | The first two answer `403 FORBIDDEN_ORIGIN`, create no session, and are not counted by the throttle. The last two sign in (`200`). The foreign logout answers `403`, and its session still works afterwards. | negative | NFR-02 |
| AC-F02-09 | Guard order | (a) A `POST /api/requests` with a foreign `Origin` and no session; (b) a `GET /api/reviews/inbox` with no session | (a) `403 FORBIDDEN_ORIGIN`, not `401`; (b) `401`, not `403` | boundary | NFR-01, NFR-02 |
| AC-F02-10 | (a) An app whose Prisma stub throws `Error("SECRET-DETAIL")` on the session lookup; (b) the real app | (a) `GET /api/auth/me` with any cookie; (b) `POST /api/auth/login` with the body `{"email":` | (a) `500 INTERNAL_ERROR` with the fixed message; the body contains neither `SECRET-DETAIL` nor a stack line. (b) `400 VALIDATION_ERROR` with the fixed message and no parser text. | negative | NFR-06 |
| AC-F02-11 | A signed-in requester, then a signed-in reviewer | The header is rendered | The requester sees My Requests and New Request, and no Review Inbox; the reviewer sees all three | normal | FR-10 |
| AC-F02-12 | A signed-in requester, and separately a signed-out visitor | The requester opens `/reviews`; the visitor opens `/requests` | The requester sees "This page is not available to you." and the inbox endpoint is not requested. The visitor is sent to `/login`. | negative | FR-10, NFR-02 |

## 4. Software Test Specification (STS)

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File / test name |
|---|---|---|---|---|---|---|
| TEST-F02-01 | AC-F02-01 | API | No cookie; test app with a seeded database | Table-driven over the seven routes | Each `401`, code `UNAUTHENTICATED`, `Object.keys(body)` equals `["error"]` | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-02 | AC-F02-02 | API | No cookie | Call the four routes | No `401` or `403`; logout `204` | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-03 | AC-F02-03 | API | A requester agent | Inbox; decision with `{ "decision": "APPROVE" }`; decision with the raw body `{"decision":` and a JSON content type | `403 FORBIDDEN` for all three | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-04 | AC-F02-04 | API | Requester and reviewer agents | For each `ROUTE_POLICIES` entry and each allowed role, send a minimal request | Status not in {401, 403} | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-05 | AC-F02-05 | API | A reviewer agent; then no cookie | Call the four unlisted routes both ways | Each `404 NOT_FOUND`; body keys `["error"]` | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-06 | AC-F02-06 | unit | `createApp` with a stub Prisma | Collect method and path from the router stack; compare with `ROUTE_POLICIES` | Every registered route matches exactly one policy | `server/tests/sprint-1/route-policies.test.ts` |
| TEST-F02-07 | AC-F02-07 | API | Requester agent; reviewer's id from the seed | Send the three headers to `/me` and the inbox; repeat without a cookie | `/me` returns the requester's id and role; inbox `403`; no cookie `401` | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-08 | AC-F02-08 | API-DB | Throttle reset; session count recorded | The four login variants; then a foreign-origin logout followed by `/me` | Statuses as stated; the session count rises only for the two allowed sign-ins; a correct sign-in after the two refusals is not throttled; `/me` `200` after the refused logout | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-09 | AC-F02-09 | API | No cookie | (a) `POST /api/requests` with `Origin: https://evil.example`; (b) `GET /api/reviews/inbox` | (a) `403 FORBIDDEN_ORIGIN`; (b) `401 UNAUTHENTICATED` | `server/tests/sprint-1/authorization.api.test.ts` |
| TEST-F02-10 | AC-F02-10 | API | (a) `createApp({ prisma: stub })` with a throwing `session.findUnique`; (b) the real app | Send the two requests | (a) `500`, fixed message, body text has no `SECRET-DETAIL` and no `    at `; (b) `400`, fixed message, no `Unexpected` or `JSON` in the body | `server/tests/sprint-1/errors.api.test.ts` |
| TEST-F02-11 | AC-F02-11 | component | Auth context with a requester, then a reviewer | Render the app shell | Navigation links as stated, queried by accessible name | `client/tests/sprint-1/Navigation.test.tsx` |
| TEST-F02-12 | AC-F02-12 | component | Requester context with a fetch spy; then a signed-out context | Navigate to `/reviews`; then to `/requests` | The message is shown and the spy has no call to `/api/reviews/inbox`; the location becomes `/login` | `client/tests/sprint-1/Navigation.test.tsx` |

**Coverage check:** AC-F02-01 to AC-F02-12 each map to exactly one TEST, and every test is automated. Ten run against the API (the backend-enforcement evidence for NFR-01, NFR-02, and NFR-06) and two are component tests of the UI conveniences. The record-scope `404` for other users' requests (BR-08) is specified and tested in F-03 and F-04.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test
- [ ] TDD evidence recorded: failing test commit, then passing implementation commit (shared with F-01 in #9)
- [ ] Every route added later (F-03, F-04) is added to `ROUTE_POLICIES` in the same commit as its handler, or TEST-F02-06 fails

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | The origin guard checks `POST` only, because Sprint 1 has no `PUT`, `PATCH`, or `DELETE` routes. Add them to the guard if such routes appear. |
