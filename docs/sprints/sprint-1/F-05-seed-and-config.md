# F-05: Seed data and cloud-ready configuration (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-05): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-05 |
| Sprint | 1 |
| Status | Draft (Draft → Agreed → Implemented → Verified) |
| Linked requirements | Configuration, persistence, and secret-handling NFRs and the demo-account FR in `docs/srs.md` (IDs added when #3 is merged) *(SRS)*; Lab 5 R-01, R-02, R-04 |
| GitHub Issue | #7 (contract), #8 (implementation) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | System-level SDS §3.4, §7, §8, §9 (#4). F-01, F-03, and F-04 depend on this feature. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure | #13 |
| 0.2 | 2026-11-14 | Menelaus122 | First complete draft | Issue #7 (F-05 part) | this PR |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

F-05 makes the application reproducible and safe to run anywhere: on a laptop, in CI, and on Cloud Run.
- **One database for everything.** Every environment builds the same schema from migrations and gets the same demo accounts from an idempotent seed.
- **No secrets in code or image.** Every setting comes from environment variables, and no secret is in the code, the image, or the logs.
- **Health checks.** Two endpoints tell a person, the smoke test, and Cloud Run whether the service is alive and whether it can reach its database.
- **Accounts for testing.** The seeded accounts are what the team and the Lab 6 partner team use, because Sprint 1 has no self-registration.

### 1.2 Workflow

1. **Migrate:** `prisma migrate deploy` applies every migration not yet applied. In Sprint 1 this is the initial identity migration: the `Role` enum, `User`, and `Session`.
2. **Seed:** `prisma db seed` runs `prisma/seed.ts`:
   1. Reads and checks `DEMO_USER_PASSWORD`. If it is missing or breaks the password rules, the seed stops before any write and exits with code 1.
   2. Upserts the four demo accounts by email, inside one transaction:
      - **New account:** created as active, with an scrypt hash of `DEMO_USER_PASSWORD`.
      - **Existing account:** name and role are set to the seed values. The hash is replaced only if it does **not** already verify against `DEMO_USER_PASSWORD`, so a rerun with the same password writes nothing, and a rotated password takes effect on the next run.
   3. Prints a summary (for example `seed: 4 accounts (0 created, 0 updated)`), never a password or hash.
3. **Start:** the server reads its configuration and fails fast if a required variable is missing (1.4), then listens on `0.0.0.0:$PORT`.
4. **Probe:**
   - `GET /api/health` answers without touching the database (liveness).
   - `GET /api/ready` runs `SELECT 1` and answers `503` if that fails (readiness).

In the cloud, steps 1 and 2 run in the Cloud Run job before each deploy, and step 4 is used by the smoke test.

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| The seed is idempotent: running it again creates no duplicate and changes nothing when the inputs are unchanged | Seed upserts by the unique `email`; the hash is replaced only when it no longer verifies (seed script, DB unique constraint) |
| No password lives in code, the image, or the logs | The only source is `DEMO_USER_PASSWORD`; the seed never prints it; there is no fallback default (seed script) |
| Passwords are stored only as scrypt hashes | `hashPassword` from `password.ts` (adapted from TokTickIT), format `scrypt$N$r$p$salt$hash` (seed script) |
| Demo data is synthetic | Fixed fictional names and `@example.com` emails (seed script) |
| Every setting comes from the environment, and a missing required setting stops the server before it serves requests | Configuration module read once at start (server) |
| Nothing the app needs is stored in the container | No file writes; sessions and data in PostgreSQL (server design, SDS §9) |

### 1.4 Validation

| Field / input | Rule | Error returned |
|---|---|---|
| `DEMO_USER_PASSWORD` (seed) | Required in every environment; 10–128 characters; at least one letter and one digit | Exit code 1; stderr `seed: DEMO_USER_PASSWORD is not set` or `seed: DEMO_USER_PASSWORD does not meet the password rules (10-128 characters, a letter and a digit)`; the value is never echoed |
| `DATABASE_URL` (server, seed, migrate) | Required | Server exits with code 1 and `config: DATABASE_URL is not set` |
| `CLIENT_ORIGINS` (server) | Required when `NODE_ENV=production`; defaults to `http://localhost:5173` otherwise | Server exits with code 1 and `config: CLIENT_ORIGINS is required in production` |
| `PORT` (server) | Optional; an integer 1–65535; default `3000` | Server exits with code 1 and `config: PORT must be a port number` |
| `NODE_ENV` (server, seed) | `development`, `test`, or `production`; default `development` | Server exits with code 1 and `config: NODE_ENV must be development, test, or production` |

Configuration error messages name the variable and never print its value.

### 1.5 Failure and boundary cases

- **Database unreachable at runtime:** `/api/health` still returns `200`, and `/api/ready` returns `503 { "status": "not_ready" }` with no error detail.
- **Seed against an empty database that has not been migrated:** the seed fails with Prisma's error and exits with code 1. The documented order is migrate, then seed.
- **Seed interrupted part-way:** all writes are in one transaction, so either all four accounts are in place or none of this run's changes are.
- **Seed with an existing account whose role was changed in the database:** the seed sets it back to its seed role. Sprint 1 has no role administration, so the seed is the source of truth for demo accounts.
- **Two seed runs at the same time** (not expected; the deploy job runs one at a time): the unique `email` constraint means at most one insert per email succeeds. The other run fails and can simply be rerun.
- **`DEMO_USER_PASSWORD` rotated:** the next seed run replaces the four hashes. Sessions created before the rotation stay valid until they expire. F-01 could clear them, but that is outside Sprint 1.

### 1.6 Permissions

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| `GET /api/health` | ✅ | ✅ | ✅ | No data |
| `GET /api/ready` | ✅ | ✅ | ✅ | No data beyond `ready` / `not_ready` |
| Run migrations or the seed | — | — | — | Command line or Cloud Run job only; no HTTP endpoint exists |

### 1.7 Dependencies

- `password.ts` (scrypt hash and verify, password rules) adapted from TokTickIT `main` @ `0f01560`. Imported in #8 because the seed needs it (#8 scope).
- PostgreSQL 16 (Docker Compose locally, Cloud SQL in the cloud).
- The Lab 5 Cloud Run job and smoke test use the two endpoints.

## 2. Layer specifications

### 2.1 UI

No change. F-05 adds no screen. The Login screen (F-01) must never show a default or demo password.

### 2.2 API

| Method | Path | Auth / role | Request | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/health` | public | none | `200 { "status": "ok" }` | none |
| `GET` | `/api/ready` | public | none | `200 { "status": "ready", "db": "connected" }` | `503 { "status": "not_ready" }` |

Both responses carry `Cache-Control: no-store`. Neither endpoint reads a session, and neither returns a version
string, hostname, or error message.

### 2.3 Data

The initial migration, `init_identity`, is the first migration in the repository:

| Object | Definition |
|---|---|
| `enum Role` | `REQUESTER`, `REVIEWER` |
| `User` | `id` serial PK; `name` varchar(100) not null; `email` varchar(254) unique not null (stored trimmed and lowercased); `password_hash` text not null; `role` Role not null; `is_active` boolean not null default `true`; `created_at` / `updated_at` timestamptz not null |
| `Session` | `id` serial PK; `token_hash` char(64) unique not null; `user_id` int not null references `User` `ON DELETE CASCADE`; `created_at` timestamptz not null default now(); `expires_at` timestamptz not null; indexes on `user_id` and `expires_at` |

`Request` and `RequestEvent` are added by later, additive migrations in F-03 and F-04.

**Demo accounts** (synthetic):

| Name | Email | Role |
|---|---|---|
| Ploy Srisawat | `ploy.requester@example.com` | `REQUESTER` |
| Nattapong Kaewdee | `nattapong.requester@example.com` | `REQUESTER` |
| Mint Chaiyaporn | `mint.reviewer@example.com` | `REVIEWER` |
| Korn Thanakit | `korn.reviewer@example.com` | `REVIEWER` |

Two of each role allow the Sprint 1 negative cases to be shown on the live app: a second requester for ownership
isolation, and a second reviewer for unrelated-reviewer access.

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F05-01 | An empty database and only the `.env.example` variables filled in | `migrate deploy`, then `seed`, are run | Both exit 0; there are exactly 4 active users (2 `REQUESTER`, 2 `REVIEWER`) with the emails in §2.3 | normal | Lab 5 R-01, R-02 |
| AC-F05-02 | The seed has run once | The seed runs again with the same `DEMO_USER_PASSWORD` | Exit 0; still 4 users, no duplicate email; every `password_hash` and `updated_at` is unchanged | boundary | *(SRS)* |
| AC-F05-03 | The seed has run once | `DEMO_USER_PASSWORD` changes and the seed runs again | Exit 0; each demo account's hash verifies the new password and not the old one | normal | *(SRS)* |
| AC-F05-04 | `DEMO_USER_PASSWORD` is not set | The seed runs | Exit 1; stderr names the variable; no user is created | negative | *(SRS)* |
| AC-F05-05 | `DEMO_USER_PASSWORD` breaks the password rules (for example 9 characters, or no digit) | The seed runs | Exit 1; stderr states the rule and does not contain the value; no user is created | negative | *(SRS)* |
| AC-F05-06 | Any seed run | Its stdout and stderr are captured | Neither contains the password value or any hash | negative | *(SRS)* |
| AC-F05-07 | Each seeded user | Its stored `password_hash` is read | It matches `scrypt$16384$8$1$<salt>$<hash>` and is not the plaintext | normal | *(SRS)* |
| AC-F05-08 | The server is running with no session | `GET /api/health` | `200 { "status": "ok" }` | normal | Lab 5 R-03 |
| AC-F05-09 | The database is reachable | `GET /api/ready` | `200 { "status": "ready", "db": "connected" }` | normal | Lab 5 R-03 |
| AC-F05-10 | The database cannot be reached | `GET /api/ready` | `503 { "status": "not_ready" }`, with no error text, stack, or connection detail in the body | negative | *(SRS)* |
| AC-F05-11 | `NODE_ENV=production` and `DATABASE_URL` or `CLIENT_ORIGINS` is missing | The server starts | It exits with code 1 before listening; the message names each missing variable and prints no value | negative | Lab 5 R-02 |
| AC-F05-12 | `PORT=4123` | The server starts | It accepts HTTP requests on port 4123 | boundary | Lab 5 R-01 |
| AC-F05-13 | The source code at the release commit | Every `process.env` and `import.meta.env` read is listed | Each variable appears in `.env.example` (placeholder value) and in `docs/labs/lab-05/deployment.md` (purpose, secret or not, source) | normal | Lab 5 R-02 |

## 4. Software Test Specification (STS)

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File / test name |
|---|---|---|---|---|---|---|
| TEST-F05-01 | AC-F05-01 | integration (DB) | A throwaway PostgreSQL schema; synthetic `DEMO_USER_PASSWORD` set by the test | Run `migrate deploy`, then the seed | Exit codes 0; query returns 4 active users with the §2.3 emails and roles | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-02 | AC-F05-02 | integration (DB) | After TEST-F05-01's state | Record each user's `password_hash` and `updated_at`; run the seed again | Exit 0; 4 users; hashes and `updated_at` identical | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-03 | AC-F05-03 | integration (DB) | Seeded with password A | Run the seed with password B | `verifyPassword(B, hash)` is true and `verifyPassword(A, hash)` is false for each account | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-04 | AC-F05-04 | integration (DB) | Empty migrated schema; `DEMO_USER_PASSWORD` unset | Run the seed as a child process | Exit 1; stderr contains `DEMO_USER_PASSWORD is not set`; user count 0 | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-05 | AC-F05-05 | integration (DB) | `DEMO_USER_PASSWORD` = a 9-character value, then a value with no digit | Run the seed as a child process for each | Exit 1 each time; stderr states the rule; stderr does not contain the value; user count 0 | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-06 | AC-F05-06 | integration (DB) | Any of TEST-F05-01, -02, -03 runs | Capture stdout and stderr | Neither contains the password value nor the substring `scrypt$` | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-07 | AC-F05-07 | integration (DB) | After TEST-F05-01 | Read each `password_hash` | Matches `/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/` and differs from the password | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-08 | AC-F05-08 | API | App with a working database | `GET /api/health` with no cookie | `200`, body `{ "status": "ok" }` | `server/tests/sprint-1/health.api.test.ts` |
| TEST-F05-09 | AC-F05-09 | API | App with a working database | `GET /api/ready` | `200`, body `{ "status": "ready", "db": "connected" }` | `server/tests/sprint-1/health.api.test.ts` |
| TEST-F05-10 | AC-F05-10 | API | App built with a database client that cannot connect | `GET /api/ready` | `503`, body exactly `{ "status": "not_ready" }` | `server/tests/sprint-1/health.api.test.ts` |
| TEST-F05-11 | AC-F05-11 | unit | `loadConfig()` called with production environments missing `DATABASE_URL`, `CLIENT_ORIGINS`, or both | Call it | It throws a configuration error naming each missing variable; the message contains no value | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-12 | AC-F05-12 | integration | `PORT=4123` | Start the server process; request `/api/health` on that port | `200` | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-13 | AC-F05-13 | manual (static check) | The release commit | `git grep -nE "process\.env\.|import\.meta\.env\."` and compare with `.env.example` and `deployment.md` | Every variable found is documented in both | Recorded in the #8 PR and in Part F |

**Coverage check:** AC-F05-01 to AC-F05-13 each map to exactly one TEST. TEST-F05-13 is manual because it checks
documentation against code. Every other test is automated.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test (or a recorded manual check that says why it is manual)
- [ ] TDD evidence recorded for each rule: failing test commit, then passing implementation commit
- [ ] A fresh clone, following only the README, reaches a seeded database and a `200` from `/api/ready`
- [ ] `.env.example` and `deployment.md` list every variable (TEST-F05-13)

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | Sessions created before a password rotation stay valid until they expire (§1.5). |
