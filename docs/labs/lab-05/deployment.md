# Deployment: Lab 5 (GCP and CI/CD)

> Required by Lab 5 section 4.3. Covers the stack and changes from the reference, every environment variable,
> the build/test/run/migrate/seed commands, GCP resource names, and the release procedure.
> Status: sections 1 to 3 are written (#8). Sections 4 to 7 are filled in during the Lab 5 Issues (label `lab5`):
> nothing has been deployed yet, so no GCP name below is real until then.
> **Never write a real secret value in this file**: names and sources only.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure (#2) |
| 0.2 | 2026-11-15 | Menelaus122 | Stack, every environment variable the code reads, and the local commands | Issue #8 (F-05, TEST-F05-13) |

---

## 1. Stack and changes from the reference

| Component | Reference (Lab 5 Starter Kit) | Ours | Reason for any change |
|---|---|---|---|
| Runtime | Node 24 (kit: `node:24-alpine`) | Node 24 | none |
| Container | One image: UI + API | One image (Lab 5 Issue) | none planned |
| Hosting | Cloud Run | Cloud Run (planned) | none planned |
| Database | Cloud SQL for PostgreSQL | Cloud SQL for PostgreSQL 16 (planned); locally PostgreSQL 16 in Docker | none |
| Images | Artifact Registry | Artifact Registry (planned) | none planned |
| Runtime secrets | Secret Manager | Secret Manager (planned) | none planned |
| CI/CD | GitHub Actions + Workload Identity Federation | Same (planned) | none planned |
| Application | Express + Prisma + React | Express 4 + Prisma 5 + React 18 + Vite | the domain is the approval workflow, not the ticketing app |

## 2. Environment variables

> Every variable the code reads (`git grep -nE "process\.env|import\.meta\.env"`), plus the ones Docker Compose
> reads. The same list is in `.env.example`, `server/.env.example`, and `client/.env.example`. F-05 TEST-F05-13
> checks this table against the code. **Values are never written here.**

| Variable | Read by | Purpose | Secret? | Local value comes from | Cloud value comes from |
|---|---|---|---|---|---|
| `DATABASE_URL` | server, seed, `prisma migrate` | PostgreSQL connection string; required in every environment | **Yes** | `server/.env` (git-ignored) | Secret Manager |
| `DEMO_USER_PASSWORD` | seed | Password of the four demo accounts; 10 to 128 characters with a letter and a digit; required, no default; never printed | **Yes** | `server/.env` (git-ignored) | Secret Manager |
| `NODE_ENV` | server, seed | `development`, `test`, or `production` (default `development`); `production` turns on the cookie `Secure` flag (F-01) and requires `CLIENT_ORIGINS` | No | `server/.env`; the test runner sets `test` | Cloud Run environment variable (`production`) |
| `PORT` | server | HTTP port, 1 to 65535 (default 3000) | No | `server/.env` or the default | Set by Cloud Run |
| `CLIENT_ORIGINS` | server | Comma-separated browser origins allowed to `POST` (F-02); required in production, default `http://localhost:5173` otherwise | No | `server/.env` or the default | Cloud Run environment variable; set **before** the first deploy (SDS §8) |
| `API_PROXY_TARGET` | client dev server (Vite) | Where `/api` is proxied during local development (default `http://localhost:3000`) | No | `client/.env` (optional) | Not used: the API container serves the built client |
| `CI` | client Playwright config | Set to a true value by GitHub Actions; Playwright then starts its own dev server | No | unset | Set by GitHub Actions |
| `POSTGRES_USER` | Docker Compose (`db` service) | Database user of the local container (default `approval_flow`) | No | `.env` (git-ignored) | Not used: Cloud SQL |
| `POSTGRES_PASSWORD` | Docker Compose (`db` service) | Password of the local database user; required | **Yes** | `.env` (git-ignored) | Not used: Cloud SQL |
| `POSTGRES_DB` | Docker Compose (`db` service) | Database name of the local container (default `approval_flow`) | No | `.env` | Not used: Cloud SQL |
| `POSTGRES_PORT` | Docker Compose (`db` service) | Host port of the local container (default 5433) | No | `.env` | Not used |

**One behaviour to know.** Importing `@prisma/client` loads `server/.env` into `process.env`, without overriding
any variable that is already defined (an empty value counts as defined). A local `.env` is therefore configuration
for the server and the seed, and a variable set in the shell wins. The container image must not contain `.env`
files (the Lab 5 `.dockerignore` excludes them), so in the cloud only the real environment applies.

## 3. Commands

| Purpose | Command |
|---|---|
| Start the database | `docker compose up -d db` |
| Install | `cd server && npm ci`; `cd client && npm ci` |
| Migrate | `cd server && npm run db:deploy` (apply); `npm run db:migrate` (new migration, development only) |
| Seed | `cd server && npm run db:seed` (idempotent) |
| Test (unit + API) | `cd server && npm test`; `cd client && npm test` |
| Test (e2e) | `cd client && npm run e2e` |
| Type-check | `npm run typecheck` in `server` and in `client` |
| Build | `cd server && npm run build` (to `dist/`); `cd client && npm run build` |
| Run locally with DB | `docker compose up -d db`, then `cd server && npm run dev` and `cd client && npm run dev` |
| Fresh-clone check (C-03) | The README setup on a clean clone is verified in #8. The Docker image version of C-03 comes with the Dockerfile in Lab 5. |

## 4. GCP project and resources

> Resource **names** only. Never record secret values here.

| Item | Name / value |
|---|---|
| Project ID | |
| Region | |
| Artifact Registry repository | |
| Cloud Run service | |
| Cloud Run migration job | |
| Cloud SQL instance / database / user | |
| Secret Manager secrets (names) | |
| Runtime service account | |
| Deployer service account | |
| Workload Identity pool / provider | |
| Budget alert | |

## 5. CI/CD pipeline

| Workflow | Trigger | Jobs | Required check name |
|---|---|---|---|
| `.github/workflows/ci-docker.yml` | PR into `staging` / `main` | | |
| `.github/workflows/deploy.yml` | Push to `main`; manual rollback | | — |

## 6. Release procedure

1. Create or choose a GitHub Issue (label `lab5` for Lab 5 work).
2. Branch from the latest `staging`: `type/<issue#>-short-name`.
3. Open a PR into `staging`. CI must pass, and the teammate reviews with a specific comment and merges with a merge commit.
4. Open a release PR `staging` → `main`. CI must pass (required check), and the teammate reviews and merges.
5. The merge into `main` triggers the deploy workflow: _TBD (build → push image tagged with the full SHA → migrate → deploy by digest → smoke test)_.
6. Tag the accepted release: _TBD (e.g. `git tag v1.0.0-sprint1 <sha>` and push the tag)_.

### 6.1 How to find the commit that is running

_TBD (e.g. the Cloud Run revision's image tag = full commit SHA)._

### 6.2 Rollback and roll forward

_TBD._

## 7. Cost control

- Alerts-only budget created before any resource: _TBD_
- Cloud Run min instances 0, max ≤ 3
- Smallest Cloud SQL tier, storage auto-increase off
- Pause when idle (Student Guide Episode 9). **No teardown before grading ends.**
