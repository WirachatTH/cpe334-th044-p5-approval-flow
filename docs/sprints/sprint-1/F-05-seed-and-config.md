# F-05: Seed data and cloud-ready configuration (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-05): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-05 |
| Sprint | 1 |
| Status | Implemented (Draft → Agreed → Implemented → Verified) |
| Linked requirements | FR-11, FR-12; NFR-03, NFR-06, NFR-08, NFR-09, NFR-10; Lab 5 R-01, R-02, R-04 |
| GitHub Issue | #7 (contract), #8 (implementation) |
| Author / reviewer | `Menelaus122` / `WirachatTH` |
| Depends on | System-level SDS §3.4, §7, §8, §9 (#4). F-01, F-03, and F-04 depend on this feature. |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure | #13 |
| 0.2 | 2026-11-14 | Menelaus122 | First complete draft | Issue #7 (F-05 part) | #19 |
| 0.3 | 2026-11-14 | Menelaus122 | The seed reads first and writes only what differs (no upsert), so `updated_at` stays unchanged on a rerun. AC-F05-14 to AC-F05-17 and their tests cover every §1.4 case. AC-F05-11 is verified at process level (exit code 1), and the loader's rejections are unit-tested. The app and config take injected dependencies (`createApp({ prisma })`, `loadConfig(env)`). | Review of PR #19, before any F-05 test commit | #21 |
| 0.4 | 2026-11-14 | Menelaus122 | AC-F05-18 to AC-F05-20 added: the production loader cases, the reset of a changed account with the summary counts, and the seed without `DATABASE_URL`. TEST-F05-11 now checks for the missing `listening` line within the time limit. More invalid `PORT` values. "The only server-runtime file" wording. Table `app_user`. Requirement IDs replace the *(SRS)* markers. Status: Agreed. (Row 0.3's `createApp({ prisma })` means `createApp({ prisma, config })`.) | Review of PR #21 | #26 |
| 0.5 | 2026-11-14 | Menelaus122 | AC-F05-15 and TEST-F05-15: the check that the message does not contain the value is skipped for the empty value `""`, because an empty string is contained in every message. Node 24 with Prisma 5 verified: `npm install`, `prisma generate`, `prisma migrate`, `tsc`, and `vite build` ran on Node 24.14.0 at the start of #8 (the test run is recorded in §6). | Review of PR #26 | #8 |
| 0.6 | 2026-11-15 | Menelaus122 | `NODE_ENV` is read by the server only, not the seed (§1.4). TEST-F05-12 also checks the body `{ "status": "ok" }`. TEST-F05-20 allows 15 s, since the limit includes the tsx start-up. AC-F05-21 and TEST-F05-21 added: the placeholder `DEMO_USER_PASSWORD` in `server/.env.example` must fail the password rules, so an unedited copy cannot seed a public password. | Review of PR #27 | #9 |

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
   2. Inside one transaction, **reads** each of the four demo accounts by email, then writes only when needed. It never uses `upsert`: an update, even with identical values, would change Prisma's `@updatedAt`.
      - **Missing account:** created as active, with an scrypt hash of `DEMO_USER_PASSWORD`.
      - **Existing account:** the seed compares `name` and `role` with the seed values and checks whether `password_hash` verifies against `DEMO_USER_PASSWORD`. If everything matches, **no `UPDATE` is issued**. Otherwise one `UPDATE` sets only the fields that differ, and the hash is rewritten only when it no longer verifies. So a rerun with the same inputs writes nothing, and a rotated password takes effect on the next run.
   3. Prints a summary (for example `seed: 4 accounts (0 created, 0 updated, 4 unchanged)`), never a password or hash.
3. **Start:** `index.ts` calls `loadConfig(process.env)`, a pure function that returns the configuration or throws a `ConfigError` (1.4).
   - On a `ConfigError`, `index.ts` prints its message to stderr and exits with code 1, before creating the app or opening a port.
   - Otherwise it builds the app with `createApp({ prisma, config })`, listens on `0.0.0.0:$PORT`, and only then prints `server: listening on port <PORT>` to stdout.
4. **Probe:**
   - `GET /api/health` answers without touching the database (liveness).
   - `GET /api/ready` runs `SELECT 1` through the injected Prisma client and answers `503` if that fails (readiness).

In the cloud, steps 1 and 2 run in the Cloud Run job before each deploy, and step 4 is used by the smoke test.

### 1.3 Business rules enforced

| Rule | How it is enforced (layer) |
|---|---|
| The seed is idempotent: running it again creates no duplicate and changes nothing when the inputs are unchanged | Seed reads by the unique `email`, creates only missing accounts, and issues an `UPDATE` only for fields that differ; the hash is replaced only when it no longer verifies (seed script, DB unique constraint) |
| No password lives in code, the image, or the logs | The only source is `DEMO_USER_PASSWORD`; the seed never prints it; there is no fallback default (seed script) |
| Passwords are stored only as scrypt hashes | `hashPassword` from `password.ts` (adapted from TokTickIT), format `scrypt$N$r$p$salt$hash` (seed script) |
| Demo data is synthetic | Fixed fictional names and `@example.com` emails (seed script) |
| Every setting comes from the environment, and a missing required setting stops the server before it serves requests | Configuration module read once at start (server) |
| Nothing the app needs is stored in the container | No file writes; sessions and data in PostgreSQL (server design, SDS §9) |

### 1.4 Validation

| Field / input | Rule | Error returned |
|---|---|---|
| `DEMO_USER_PASSWORD` (seed) | Required in every environment; 10–128 characters; at least one letter and one digit | Exit code 1; stderr `seed: DEMO_USER_PASSWORD is not set` or `seed: DEMO_USER_PASSWORD does not meet the password rules (10-128 characters, a letter and a digit)`; the value is never echoed |
| `DATABASE_URL` (server, seed, migrate) | Required in every environment | Server: `config: DATABASE_URL is not set`, then exit code 1. Seed: `seed: DATABASE_URL is not set` and exit code 1, before it connects or writes anything. |
| `CLIENT_ORIGINS` (server) | Required when `NODE_ENV=production`; otherwise defaults to `http://localhost:5173`. Comma-separated, each entry trimmed. | `config: CLIENT_ORIGINS is required in production` |
| `PORT` (server) | Optional; an integer 1–65535; default `3000` | `config: PORT must be a port number` |
| `NODE_ENV` (server) | `development`, `test`, or `production`; default `development` | `config: NODE_ENV must be development, test, or production` |

`loadConfig(env)` collects **every** problem and throws one `ConfigError` whose message lists them, one per line.
`index.ts` turns that error into stderr output and exit code 1 (§1.2 step 3). The messages name the variable and
never contain its value.

### 1.5 Failure and boundary cases

- **Database unreachable at runtime:** `/api/health` still returns `200`, and `/api/ready` returns `503 { "status": "not_ready" }` with no error detail.
- **Seed against an empty database that has not been migrated:** the seed fails with Prisma's error and exits with code 1. The documented order is migrate, then seed.
- **Seed interrupted part-way:** all writes are in one transaction, so either all four accounts are in place or none of this run's changes are.
- **Seed with an existing account whose role was changed in the database:** the seed sets it back to its seed role. Sprint 1 has no role administration, so the seed is the source of truth for demo accounts.
- **Two seed runs at the same time** (not expected; the deploy job runs one at a time): both may read "missing" for the same email, but the unique `email` constraint lets only one insert succeed. The other run's transaction fails and rolls back, and it can simply be rerun.
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
- **Injected dependencies, so the rules can be tested without starting a real process for each case:**
  - `loadConfig(env)` takes the environment as an argument and has no side effects (TEST-F05-14 to TEST-F05-18).
  - `createApp({ prisma, config })` receives its Prisma client, so a test can pass a client whose `$queryRaw` rejects (TEST-F05-10).
  - `index.ts` is the only **server-runtime** file that reads `process.env`, creates the real Prisma client, and calls `process.exit`. The seed (`prisma/seed.ts`) is a separate command, and it reads `DATABASE_URL` and `DEMO_USER_PASSWORD` itself.

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
| `User` (table `app_user`) | `id` serial PK; `name` varchar(100) not null; `email` varchar(254) unique not null (stored trimmed and lowercased); `password_hash` text not null; `role` Role not null; `is_active` boolean not null default `true`; `created_at` / `updated_at` timestamptz not null |
| `Session` (table `session`) | `id` serial PK; `token_hash` char(64) unique not null; `user_id` int not null references `app_user` `ON DELETE CASCADE`; `created_at` timestamptz not null default now(); `expires_at` timestamptz not null; indexes on `user_id` and `expires_at` |

`User` maps to the table **`app_user`** (`@@map("app_user")`), not `user`, because `user` is a reserved word in
PostgreSQL, so hand-written SQL would otherwise need quotes everywhere. `ApprovalRequest` and `RequestEvent` are
added by F-03's later, additive migration.

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
| AC-F05-01 | An empty database and only the `.env.example` variables filled in | `migrate deploy`, then `seed`, are run | Both exit 0; there are exactly 4 active users (2 `REQUESTER`, 2 `REVIEWER`) with the emails in §2.3; the seed prints `seed: 4 accounts (4 created, 0 updated, 0 unchanged)` | normal | Lab 5 R-01, R-02 |
| AC-F05-02 | The seed has run once | The seed runs again with the same `DEMO_USER_PASSWORD` | Exit 0; still 4 users, no duplicate email; every `password_hash` and `updated_at` is unchanged; the seed prints `seed: 4 accounts (0 created, 0 updated, 4 unchanged)` | boundary | FR-11 |
| AC-F05-03 | The seed has run once | `DEMO_USER_PASSWORD` changes and the seed runs again | Exit 0; each demo account's hash verifies the new password and not the old one | normal | FR-11, NFR-09 |
| AC-F05-04 | `DEMO_USER_PASSWORD` is not set | The seed runs | Exit 1; stderr names the variable; no user is created | negative | NFR-09 |
| AC-F05-05 | `DEMO_USER_PASSWORD` breaks the password rules (for example 9 characters, or no digit) | The seed runs | Exit 1; stderr states the rule and does not contain the value; no user is created | negative | NFR-03, NFR-09 |
| AC-F05-06 | Any seed run | Its stdout and stderr are captured | Neither contains the password value or any hash | negative | NFR-09 |
| AC-F05-07 | Each seeded user | Its stored `password_hash` is read | It matches `scrypt$16384$8$1$<salt>$<hash>` and is not the plaintext | normal | NFR-03 |
| AC-F05-08 | The server is running with no session | `GET /api/health` | `200 { "status": "ok" }` | normal | FR-12, Lab 5 R-03 |
| AC-F05-09 | The database is reachable | `GET /api/ready` | `200 { "status": "ready", "db": "connected" }` | normal | FR-12, Lab 5 R-03 |
| AC-F05-10 | The database cannot be reached | `GET /api/ready` | `503 { "status": "not_ready" }`, with no error text, stack, or connection detail in the body | negative | FR-12, NFR-06 |
| AC-F05-11 | A configuration error: `NODE_ENV=production` with both `DATABASE_URL` and `CLIENT_ORIGINS` missing | The server **process** starts | It exits with code 1 before opening a port; stderr names both variables and prints no value | negative | Lab 5 R-02 |
| AC-F05-12 | `PORT=4123` | The server starts | It accepts HTTP requests on port 4123 | boundary | Lab 5 R-01 |
| AC-F05-13 | The source code at the release commit | Every `process.env` and `import.meta.env` read is listed | Each variable appears in `.env.example` (placeholder value) and in `docs/labs/lab-05/deployment.md` (purpose, secret or not, source) | normal | Lab 5 R-02 |
| AC-F05-14 | `NODE_ENV=development` (and separately `test`) with `DATABASE_URL` unset | `loadConfig(env)` runs | It throws a `ConfigError` whose message contains `config: DATABASE_URL is not set` | negative | Lab 5 R-02 |
| AC-F05-15 | `PORT` is `abc`, `0`, `65536`, `3000abc`, `80.5`, `-1`, or `""`; then unset; then `4123` | `loadConfig(env)` runs | The seven invalid values each throw `config: PORT must be a port number`, and, for every invalid value except the empty string, the message does not contain the value (so `parseInt`-style partial parsing is not allowed; the empty string is contained in every message, so that check is skipped for it); unset gives `3000`; `4123` gives `4123` | boundary | Lab 5 R-01 |
| AC-F05-16 | `NODE_ENV` is `staging`, then unset | `loadConfig(env)` runs | `staging` throws `config: NODE_ENV must be development, test, or production`, without the value; unset gives `development` | negative | Lab 5 R-02 |
| AC-F05-17 | `NODE_ENV=development` with `CLIENT_ORIGINS` unset, then set to `" https://a.example , https://b.example "` | `loadConfig(env)` runs | Unset gives `["http://localhost:5173"]`; the set value gives `["https://a.example", "https://b.example"]`, trimmed | normal | Lab 5 R-02 |
| AC-F05-18 | `NODE_ENV=production` with (a) only `CLIENT_ORIGINS` missing, (b) only `DATABASE_URL` missing, (c) every variable valid | `loadConfig(env)` runs | (a) It throws naming `CLIENT_ORIGINS` only; (b) it throws naming `DATABASE_URL` only; (c) it returns the production configuration without throwing | negative / normal | NFR-09, Lab 5 R-02 |
| AC-F05-19 | The seed has run, and one demo account's name and role were then changed directly in the database | The seed runs again with the same `DEMO_USER_PASSWORD` | Exit 0; that account's name and role are restored by one `UPDATE`; its `password_hash` is unchanged; only its `updated_at` changes; the seed prints `seed: 4 accounts (0 created, 1 updated, 3 unchanged)` | boundary | FR-11 |
| AC-F05-20 | `DATABASE_URL` is not set (`DEMO_USER_PASSWORD` is valid) | The seed runs | Exit 1 with `seed: DATABASE_URL is not set` on stderr, before any connection attempt | negative | NFR-09 |
| AC-F05-21 | The `DEMO_USER_PASSWORD` placeholder written in `server/.env.example` | The seed runs with exactly that value | Exit 1 with the password-rules message and no user created: an unedited copy of the example file cannot seed a public password | negative | NFR-09 |

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
| TEST-F05-10 | AC-F05-10 | API | App created with `createApp({ prisma: stub, config })`, where the stub's `$queryRaw` rejects with a connection error | `GET /api/ready` | `503`; the body is exactly `{ "status": "not_ready" }`, with no text from the stub's error | `server/tests/sprint-1/health.api.test.ts` |
| TEST-F05-11 | AC-F05-11 | integration (process) | Spawn the built server (`node dist/index.js`) with `NODE_ENV=production`, no `DATABASE_URL`, no `CLIENT_ORIGINS`, `PORT` set to a free port | Wait for the process to exit (10 s limit) | The process exits on its own within 10 s with exit code 1 (the test fails if it is still running); stderr contains `DATABASE_URL` and `CLIENT_ORIGINS`; stdout contains no `listening` line | `server/tests/sprint-1/config.process.test.ts` |
| TEST-F05-12 | AC-F05-12 | integration (process) | `PORT=4123` and a valid configuration | Spawn the built server; request `/api/health` on that port | `200`, body `{ "status": "ok" }` | `server/tests/sprint-1/config.process.test.ts` |
| TEST-F05-13 | AC-F05-13 | manual (static check) | The release commit | `git grep -nE "process\.env\.|import\.meta\.env\."` and compare with `.env.example` and `deployment.md` | Every variable found is documented in both | Recorded in the #8 PR and in Part F |
| TEST-F05-14 | AC-F05-14 | unit | `env` = `{ NODE_ENV: "development" }`, then `{ NODE_ENV: "test" }` | `loadConfig(env)` | Throws `ConfigError`; message contains `config: DATABASE_URL is not set` | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-15 | AC-F05-15 | unit | `env` with a valid `DATABASE_URL` and `PORT` = `"abc"`, `"0"`, `"65536"`, `"3000abc"`, `"80.5"`, `"-1"`, `""`, unset, `"4123"` | `loadConfig(env)` for each | The seven invalid values throw `config: PORT must be a port number`, and the message contains none of them, except that the check is skipped for `""`; unset → `port === 3000`; `"4123"` → `port === 4123` | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-16 | AC-F05-16 | unit | `env` with a valid `DATABASE_URL` and `NODE_ENV` = `"staging"`, then unset | `loadConfig(env)` for each | `"staging"` throws `config: NODE_ENV must be development, test, or production`, and the message does not contain `staging`; unset → `nodeEnv === "development"` | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-17 | AC-F05-17 | unit | `env` with `NODE_ENV: "development"`, a valid `DATABASE_URL`, and `CLIENT_ORIGINS` unset, then `" https://a.example , https://b.example "` | `loadConfig(env)` for each | `clientOrigins` equals `["http://localhost:5173"]`, then `["https://a.example", "https://b.example"]` | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-18 | AC-F05-18 | unit | `NODE_ENV: "production"` envs: (a) valid `DATABASE_URL`, no `CLIENT_ORIGINS`; (b) `CLIENT_ORIGINS`, no `DATABASE_URL`; (c) all valid, with `PORT: "8080"` | `loadConfig(env)` for each | (a) throws, and the message names `CLIENT_ORIGINS` and not `DATABASE_URL`; (b) names `DATABASE_URL` and not `CLIENT_ORIGINS`; (c) returns `{ nodeEnv: "production", port: 8080, clientOrigins: ["https://a.example"] }` | `server/tests/sprint-1/config.test.ts` |
| TEST-F05-19 | AC-F05-19 | integration (DB) | Seeded once; then Ploy's row updated in the test to `name = 'Changed'`, `role = 'REVIEWER'`; every row's `password_hash` and `updated_at` recorded | Run the seed again with the same password | Exit 0; Ploy's `name` and `role` are back to the §2.3 values; her `password_hash` is unchanged and her `updated_at` is newer; the other three `updated_at` values are unchanged; stdout contains `(0 created, 1 updated, 3 unchanged)` | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-20 | AC-F05-20 | integration (process) | `DATABASE_URL` removed from the child's environment; a valid `DEMO_USER_PASSWORD` | Spawn the seed command | It exits within 15 s with code 1; stderr contains `seed: DATABASE_URL is not set` | `server/tests/sprint-1/seed.test.ts` |
| TEST-F05-21 | AC-F05-21 | integration (process) | The `DEMO_USER_PASSWORD=` value read from `server/.env.example`; the empty migrated schema | Spawn the seed with that value | Exit 1; stderr contains `does not meet the password rules`; user count 0 | `server/tests/sprint-1/seed.test.ts` |

**Coverage check:**
- AC-F05-01 to AC-F05-21 each map to exactly one TEST, and every rule in §1.4 has an AC:
  - `DEMO_USER_PASSWORD`: 04, 05, 21
  - `DATABASE_URL`: 11, 14, 18 (server); 20 (seed)
  - `CLIENT_ORIGINS`: 11, 17, 18
  - `PORT`: 12, 15
  - `NODE_ENV`: 16
- TEST-F05-13 is manual because it checks documentation against code. Every other test is automated.
- The process-level tests (11, 12) prove the wiring from `ConfigError` to exit code 1. The unit tests (14 to 17) cover each rule without starting a process.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test (or a recorded manual check that says why it is manual)
- [ ] TDD evidence recorded for each rule: failing test commit, then passing implementation commit
- [ ] A fresh clone, following only the README, reaches a seeded database and a `200` from `/api/ready`
- [ ] `.env.example` and `deployment.md` list every variable (TEST-F05-13)

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | `198c2ec` v0.2 (PR #19), `66cf6b3` v0.3 (PR #21), `ccffa2e` v0.4 (PR #26), `7fd0df9` v0.5 (this branch, before any test) |
| Red commit(s) and failing test | `f129d42`: TEST-F05-01 to 12 and 14 to 20 against the scaffold stubs: **28 failed on assertions, 2 passed** (the PORT default and a valid production configuration, which the stubs already satisfied). `7564493` is a test-only fix made during implementation (child processes no longer inherit `server/.env`); against the stubs the result was unchanged. |
| Green commit(s) | `1547648`: the same tests, **30 passed** |
| PR (author → reviewer) | Menelaus122 → WirachatTH; branch `feat/8-project-foundation` into `staging` (the PR number is in Issue #8) |
| Test run (command, commit, pass / fail / skip) | `cd server && npm test` at `1547648` (docs-only commits after it): 4 files, **30 passed, 0 failed, 0 skipped**, Node 24.14.0, PostgreSQL 16. Repeated with `server/.env` hidden and only `DATABASE_URL` in the environment (as in CI): 30 passed. TEST-F05-13 (manual): every variable the code reads (11, including the Docker Compose ones) appears in an `.env.example` file and in `docs/labs/lab-05/deployment.md`. |
| Known limitations | Sessions created before a password rotation stay valid until they expire (§1.5). `loadConfig` rejects an empty `PORT` or `NODE_ENV` but treats an empty `DATABASE_URL`, `CLIENT_ORIGINS`, or `DEMO_USER_PASSWORD` as not set. A local `server/.env` is read by any process that imports `@prisma/client` (see `deployment.md` §2). |
