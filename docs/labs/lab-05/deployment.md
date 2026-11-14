# Deployment: Lab 5 (GCP and CI/CD)

> Required by Lab 5 section 4.3. Covers the stack and changes from the reference, every environment variable,
> the build/test/run/migrate/seed commands, GCP resource names, and the release procedure.
> Status: skeleton. Filled in during the Lab 5 Issues (label `lab5`).
> **Never write a real secret value in this file**: names and sources only.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | | Skeleton created | Repository structure |

---

## 1. Stack and changes from the reference

| Component | Reference (Lab 5 Starter Kit) | Ours | Reason for any change |
|---|---|---|---|
| Container | One image: UI + API | | |
| Hosting | Cloud Run | | |
| Database | Cloud SQL for PostgreSQL | | |
| Images | Artifact Registry | | |
| Runtime secrets | Secret Manager | | |
| CI/CD | GitHub Actions + Workload Identity Federation | | |

## 2. Environment variables

> Every variable the app reads (search for `process.env` and `import.meta.env`). The same list must appear in `.env.example`.

| Variable | Read by | Purpose | Secret? | Local value comes from | Cloud value comes from |
|---|---|---|---|---|---|
| `DATABASE_URL` | server | PostgreSQL connection string | **Yes** | `.env` (not committed) | Secret Manager |
| `PORT` | server | HTTP port | No | default | Set by Cloud Run |
| `NODE_ENV` | server | Runtime mode | No | `.env` | Cloud Run env var |
| _TBD_ | | | | | |

## 3. Commands

| Purpose | Command |
|---|---|
| Install | _TBD_ |
| Migrate | _TBD_ |
| Seed | _TBD_ |
| Test (unit + API) | _TBD_ |
| Test (e2e) | _TBD_ |
| Build | _TBD_ |
| Run locally with DB (Docker Compose) | _TBD_ |
| Fresh-clone check (C-03) | _TBD_ |

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
