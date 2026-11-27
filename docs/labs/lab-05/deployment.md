# Deployment: Lab 5 (GCP and CI/CD)

> Required by Lab 5 section 4.3. Covers the stack and changes from the reference, every environment variable,
> the build/test/run/migrate/seed commands, GCP resource names, and the release procedure.
> Status: sections 1 to 3 are written (#8, #33). Sections 4 to 7 are written for the deploy pipeline (#35). The service
> has been deployed twice, from the Sprint 1 release and from the Lab 5 release (PR #59); section 6.3 records both runs and
> what the checks C-04, C-05, and C-06 showed on the live URL (the screenshots are in the Lab 5 report). The project, region,
> and URL below come from them. The budget is still to be written by the owner of Issue #1.
> **Never write a real secret value in this file**: names and sources only.

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure (#2) |
| 0.2 | 2026-11-15 | Menelaus122 | Stack, every environment variable the code reads, and the local commands | Issue #8 (F-05, TEST-F05-13) |
| 0.3 | 2026-11-15 | Menelaus122 | The image, `CLIENT_DIST_DIR`, the compose profile, and the C-03 procedure | Issue #33 |
| 0.4 | 2026-11-15 | Menelaus122 | GCP resource names, the first-time setup runbook, the CI/CD table, the release, rollback, and cost sections | Issue #35 |
| 0.5 | 2026-11-16 | Menelaus122 | The project ID, the public URL, and the status line, from the first successful deploy run. New section 6.3 records that run, what was checked on the live URL, and what C-04 to C-06 still need. | Issue #35 |
| 0.6 | 2026-11-16 | Menelaus122 | Section 1 no longer says "planned" for what the run deployed; the introduction of section 4 no longer says the project values wait for the project; section 6.3 says why the first run failed; section 6.1 says the `gcloud` commands have not been run yet. | Review of PR #58 |
| 0.7 | 2026-11-16 | WirachatTH | Section 6.3 records the second deployment (release PR #59, tag `v1.1.0-lab5`) and what C-04, C-05, and C-06 showed; the status line and the "not done yet" list are replaced by it. Section 6.1 gives the commands that were run against the deployed service. | Issue #35; review of PR #59, comment 2 |
| 0.8 | 2026-11-27 | Menelaus122 | Section 5: the CI workflow gains the job `e2e`, which runs the Playwright journeys on every pull request and before a deployment. | Issue #75 (Lab 7 retrospective action) |
| 0.9 | 2026-11-27 | Menelaus122 | Section 6.2: the rollback exception of the Sprint 2 request states (SRS D-15). | Review of PR #73 |

---

## 1. Stack and changes from the reference

| Component | Reference (Lab 5 Starter Kit) | Ours | Reason for any change |
|---|---|---|---|
| Runtime | Node 24 (kit: `node:24-alpine`) | Node 24 | none |
| Container | One image: UI + API | One image: the root `Dockerfile` (three stages). The API serves the built UI itself (`CLIENT_DIST_DIR`), so the kit's nginx is not used. | The kit's `client/Dockerfile`, `server/Dockerfile`, and `nginx.conf` are for a two-container local setup; one container is what Cloud Run runs |
| Hosting | Cloud Run | Cloud Run: the service `approval-flow` is deployed and serving (section 6.3) | none |
| Database | Cloud SQL for PostgreSQL | Cloud SQL for PostgreSQL 16, created by `deploy/deploy.sh`; the live `/api/ready` answers `"db":"connected"` (section 6.3). The version and settings are not yet checked in the Console. Locally: PostgreSQL 16 in Docker | none |
| Images | Artifact Registry | Artifact Registry: the deploy run pushed the image there and deployed it by digest (section 6.3) | none |
| Runtime secrets | Secret Manager | Secret Manager, created by `deploy/deploy.sh` (the names are in section 4); not yet checked in the Console | none |
| CI/CD | GitHub Actions + Workload Identity Federation | Same: the deploy run logged in to Google Cloud without a key (section 6.3) | none |
| Application | Express + Prisma + React | Express 4 + Prisma 5 + React 18 + Vite | the domain is the approval workflow, not the ticketing app |

## 2. Environment variables

> Every variable the code reads (`git grep -nE "process\.env|import\.meta\.env"`), plus the ones Docker Compose
> reads. The same list is in `.env.example`, `server/.env.example`, and `client/.env.example`. F-05 TEST-F05-13
> checks this table against the code. **Values are never written here.**

| Variable | Read by | Purpose | Secret? | Local value comes from | Cloud value comes from |
|---|---|---|---|---|---|
| `DATABASE_URL` | server, seed, `prisma migrate` | PostgreSQL connection string; required in every environment | **Yes** | `server/.env` (git-ignored) | Secret Manager |
| `DEMO_USER_PASSWORD` | seed; Playwright config and the e2e specs (the config reads it from `server/.env` when it is not set) | Password of the five demo accounts; 10 to 128 characters with a letter and a digit; required, no default; never printed | **Yes** | `server/.env` (git-ignored) | Secret Manager |
| `NODE_ENV` | server | `development`, `test`, or `production` (default `development`); `production` turns on the cookie `Secure` flag (F-01) and requires `CLIENT_ORIGINS` | No | `server/.env`; the test runner sets `test` | Cloud Run environment variable (`production`) |
| `PORT` | server | HTTP port, 1 to 65535 (default 3000) | No | `server/.env` or the default | Set by Cloud Run |
| `CLIENT_ORIGINS` | server | Comma-separated browser origins allowed to `POST` (F-02); required in production, default `http://localhost:5173` otherwise | No | `server/.env` or the default | Cloud Run environment variable; set **before** the first deploy (SDS §8) |
| `CLIENT_DIST_DIR` | server | Directory of the built UI. When set, the API serves the UI and the deep links of the single-page app, and the server refuses to start if `index.html` is missing (F-05 v0.7). Unset in development | No | unset (the Vite dev server serves the UI) | Set to `/app/client/dist` in the image (`Dockerfile`) |
| `API_PROXY_TARGET` | client dev server (Vite) | Where `/api` is proxied during local development (default `http://localhost:3000`) | No | `client/.env` (optional) | Not used: the API container serves the built client |
| `VITE_GIT_SHA` | client build (Vite) | The commit the UI was built from, shown in the footer as `Build <first 7 characters>`. Read when the UI is built, not at run time. Unset, or not a hexadecimal commit, shows `Build dev` (F-05 v0.10) | No | unset (the footer says `Build dev`) | Build argument `GIT_SHA` of the `Dockerfile`; the deploy workflow passes the full commit SHA |
| `CI` | client Playwright config | Set to a true value by GitHub Actions; Playwright then starts its own dev server | No | unset | Set by GitHub Actions |
| `POSTGRES_USER` | Docker Compose (`db` service) | Database user of the local container (default `approval_flow`) | No | `.env` (git-ignored) | Not used: Cloud SQL |
| `POSTGRES_PASSWORD` | Docker Compose (`db` service) | Password of the local database user; required | **Yes** | `.env` (git-ignored) | Not used: Cloud SQL |
| `POSTGRES_DB` | Docker Compose (`db` service) | Database name of the local container (default `approval_flow`) | No | `.env` | Not used: Cloud SQL |
| `POSTGRES_PORT` | Docker Compose (`db` service) | Host port of the local container (default 5433) | No | `.env` | Not used |
| `APP_PORT` | Docker Compose (`app` service, profile `app`) | Host port, on 127.0.0.1 only, of the application container (default 3000) | No | `.env` | Not used: Cloud Run assigns the port |

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
| Build the image | `docker build -t approval-flow:local .` (from the repository root) |
| Run the whole application in containers | Put `DEMO_USER_PASSWORD`, `APP_PORT`, and `CLIENT_ORIGINS` in `.env`, then `docker compose --profile app up --build`. It starts the database, runs a one-shot job (`prisma migrate deploy` and the seed), and then the application on `http://localhost:<APP_PORT>`. |
| Stop the application containers, keep the database | `docker compose --profile app rm -sf app migrate` |
| Fresh-clone check (C-03) | Clone, copy `.env.example` to `.env`, replace the placeholders (`POSTGRES_PASSWORD`, `DEMO_USER_PASSWORD`), run the compose command above, then check `/api/ready` (200), the Login screen at `/`, and a sign-in. Output is recorded in the Lab 5 evidence. |

## 4. GCP project and resources

> Resource **names** only. Never record secret values here. The names below are the ones `deploy/deploy.sh` creates;
> the project ID and the URL were written from the first deploy run (section 6.3), and the budget row is still to be written by
> the team member who owns the GCP project (Issue #1).

| Item | Name / value |
|---|---|
| Project ID | `cpe334-th044-p5` |
| Region | `asia-southeast1` |
| Artifact Registry repository | `approval-flow` (Docker); one image per commit: `approval-flow/approval-flow:<full commit SHA>` |
| Cloud Run service | `approval-flow` (public, port 3000, 512 Mi, 1 CPU, **min 0, max 3 instances**) |
| Cloud Run migration job | `approval-flow-migrate` (runs `npx prisma migrate deploy && npx prisma db seed` from the same image) |
| Cloud SQL instance / database / user | `approval-flow-pg` (PostgreSQL 16, `db-f1-micro`, `--edition=enterprise`, 10 GB SSD, storage auto-increase off) / `approval_flow` / `approval_flow` |
| Secret Manager secrets (names) | `approval-flow-database-url`, `approval-flow-demo-password`; in GitHub (optional smoke sign-in): variable `SMOKE_EMAIL`, secret `SMOKE_PASSWORD` |
| Runtime service account | `approval-flow-runner`: `roles/cloudsql.client` on the project; `roles/secretmanager.secretAccessor` on each of the two secrets only |
| Deployer service account | `approval-flow-deployer` (created in the Console, no key): `roles/run.developer` on the project; `roles/artifactregistry.writer` on the repository only; `roles/iam.serviceAccountUser` on `approval-flow-runner` only; it never reads Secret Manager |
| Workload Identity pool / provider | `github-actions` / `github-main`; `roles/iam.workloadIdentityUser` on the deployer account, granted to the principal set for this repository only |
| GitHub environment | `demo`, deployable from `main` only, with the variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` |
| Public URL | `https://approval-flow-rdaxzekvca-as.a.run.app`. Cloud Run also lists a second address for the same service, of the form `https://approval-flow-<project number>.asia-southeast1.run.app` |
| Budget alert | _alerts-only budget, created before any other resource (Issue #1)_ |

Confirmed by the log of the deploy run in section 6.3: the project, the region, the Artifact Registry repository, the
Cloud Run service, the migration job, and the name of the deployer account. The Cloud SQL, Secret Manager, runtime-account,
and Workload Identity names are the ones `deploy/deploy.sh` creates; they are not yet checked against the Console.

### 4.1 First-time setup runbook

Everything that touches billing, IAM, Cloud SQL, Secret Manager, or Cloud Run settings is **read and run by a team
member** (AGENTS.md section 7). Run it from the repository root, in Cloud Shell or on a computer with `gcloud`.

1. **Issue #1 first.** Free Trial, the project, the teammate as Editor, an alerts-only budget, and the billing check.
2. `gcloud auth login`, then `gcloud config set project <PROJECT_ID>`.
3. **Read what will happen:** `DRY_RUN=1 ./deploy/deploy.sh`. It prints every command and runs none of them.
4. **Run it as the project Owner:** `./deploy/deploy.sh`. The Owner is the account that created the project; step 5 of the script binds a role on the project, which the Editor role cannot do. It takes about 10 to 15 minutes (the Cloud SQL instance is the slow part). It is safe to run again: nothing that exists is replaced, and a credential is never regenerated once its secret has a version (a run that stopped after creating a secret but before adding its version is repeated by adding the version). It stops before deploying the service if the migration job fails. If it stops with `permission denied` at the Cloud Build step, see the next paragraph.
   *If `gcloud builds submit` fails with `permission denied`:* the account that Cloud Build runs as (the default Cloud Build service account, named in the error message) needs three roles. Read the command, replace `<CLOUD_BUILD_SA_EMAIL>` with the address from the message, and run it as the Owner, then run `./deploy/deploy.sh` again:
   `for role in roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer; do gcloud projects add-iam-policy-binding <PROJECT_ID> --member=serviceAccount:<CLOUD_BUILD_SA_EMAIL> --role=$role --condition=None; done`
5. **Check the result** in the Console (never open "View secret value" in a screenshot): the enabled APIs, the runtime account's roles, the Cloud SQL instance and database, the secret names, the service's plain environment values (`NODE_ENV`, `TZ`, and `CLIENT_ORIGINS`, which lists every address Cloud Run reports for the service, comma-separated) and its `DATABASE_URL` coming from Secret Manager, and instances 0 to 3.
6. **Open the service URL** from the script's last lines. `/api/ready` must show `"db":"connected"` and `/` must show the Login screen. To sign in, read the demo password on your own computer with `gcloud secrets versions access latest --secret approval-flow-demo-password`; do not paste it anywhere.
7. **Connect GitHub to GCP without a key** (Student Guide Episode 6). The values for this repository (they are public):
   - `REPO_ID` = `1455168739`, `OWNER_ID` = `126385856`, and the repository uses immutable subjects (`gh api repos/WirachatTH/cpe334-th044-p5-approval-flow/actions/oidc/customization/sub` shows `use_immutable_subject: true`).
   - The provider's condition:
     `assertion.repository_id == '1455168739' && assertion.repository_owner_id == '126385856' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'WirachatTH/cpe334-th044-p5-approval-flow/.github/workflows/deploy.yml@refs/heads/main' && assertion.sub == 'repo:WirachatTH@126385856/cpe334-th044-p5-approval-flow@1455168739:environment:demo'`
   - Create the deployer account `approval-flow-deployer` with the roles in section 4, the pool `github-actions` and the provider `github-main`, then the GitHub environment `demo` with the four variables. The deployer account must have **no keys**.
8. **Protect `staging` and `main`** with rulesets (Student Guide 6.5): require a pull request with 1 approval, require the status check `test-and-docker` and an up-to-date branch, empty bypass list. Then prove the gate with a normal (not draft) PR from a temporary branch that has one failing test, and close it without merging (C-02).
9. **First pipeline run:** the release PR from `staging` into `main` triggers `.github/workflows/deploy.yml`.

## 5. CI/CD pipeline

| Workflow | Trigger | Jobs | Required check name |
|---|---|---|---|
| `.github/workflows/ci-docker.yml` ("CI & Docker Build") | Pull request into `staging` or `main`; manual; `workflow_call` from `deploy.yml` | `test-and-docker`: deployment-script checks (offline), server (type-check, build, migrate, seed, tests, against PostgreSQL 16), client (type-check, tests, build), production image build, and a start of the image that must answer `/api/ready`, `/`, a deep link, and the JSON `404`. `e2e`: its own PostgreSQL 16, migrate and seed with a synthetic password, the built API on port 3000, and `npm run e2e` (Playwright, Chromium); on a failure the test output and the API log stay in the run log | `test-and-docker`; `e2e` is not required until a team member adds it to the ruleset |
| `.github/workflows/deploy.yml` ("Deploy demo") | Push to `main`; manual run with `image_tag` for a rollback | `test` (reuses the CI workflow), then `deploy`: validate settings, keyless Google login (Workload Identity Federation), build and push the image tagged with the full commit SHA (the same SHA is the build argument `GIT_SHA`, shown in the UI footer), `deploy/release.sh` (resolve the digest, run the migration job to completion, update the service to the digest), the smoke test (`deploy/smoke_test.py`), and a summary of the tag, digest, and URL | none (it is not a pull-request check) |

## 6. Release procedure

1. Create or choose a GitHub Issue (label `lab5` for Lab 5 work).
2. Branch from the latest `staging`: `type/<issue#>-short-name`.
3. Open a PR into `staging`. CI must pass, and the teammate reviews with a specific comment and merges with a merge commit.
4. Open a release PR `staging` → `main`. CI must pass (required check), and the teammate reviews and merges with a merge commit.
5. The merge into `main` triggers `deploy.yml`: CI again, then the image `approval-flow:<full commit SHA>` is built and pushed, the migration job runs to completion, the service is updated to that image's **digest**, and the smoke test runs against the public URL. A failed migration stops the release before the service changes.
6. Tag the accepted release on the merge commit, for example `git tag v1.0.0-sprint1 <merge commit SHA>` and `git push origin v1.0.0-sprint1`.

### 6.1 How to find the commit that is running

- The run summary of the deploy workflow (Actions → Deploy demo → the run) lists **Commit image tag** (the full SHA), the **Digest**, and the URL.
- From GCP: `gcloud run services describe approval-flow --region asia-southeast1 --format='value(spec.template.spec.containers[0].image)'` prints the image by digest (`...@sha256:...`). To check that this is the commit you expect, print the digest of the image tagged with that commit and compare: `gcloud artifacts docker images describe asia-southeast1-docker.pkg.dev/<PROJECT_ID>/approval-flow/approval-flow:<full commit SHA> --format='value(image_summary.digest)'`. The account that last changed the service is `gcloud run services describe approval-flow --region asia-southeast1 --format='value(metadata.annotations["serving.knative.dev/lastModifier"])'`. _Both lookups were run in Cloud Shell on 2026-11-16 against revision `approval-flow-00004-rq6`: the digests were the same, and the account was `approval-flow-deployer`._
- In the Console, Cloud Run → `approval-flow` → Revisions shows the serving revision and its container image.
- On the page itself: the footer of every screen, including the public Login screen, reads `Build <first 7 characters of the commit>` (F-05 v0.10). A release built before v0.10 has no footer.

### 6.2 Rollback and roll forward

1. Open the last good run of the deploy workflow and copy its **Commit image tag**.
2. Actions → Deploy demo → Run workflow on `main`, and enter that full 40-character SHA in `image_tag`. The tests, the build, and the migration are skipped; the image is checked, the service is updated, and the smoke test runs.
3. To go forward again, run it again with the SHA of the newer release (an empty `image_tag` would test and rebuild the current `main` instead).

A rollback changes only the application image, never the database. It is safe only while the schema is compatible with the older image, which is why migrations are additive (AGENTS.md section 5). Sprint 1 has no destructive migration.

**Exception from Sprint 2 (SRS D-15).** After the first return (F-06), or the first of two approvals (F-07), an image
from before those features cannot read the affected rows: the My Requests list of an affected requester and the detail
of an affected request fail on it. Roll back to such an image only while no request holds a new status or history
value; otherwise correct the release by rolling forward.

### 6.3 Deployment record

**The first successful run.** The push run of 15 Nov (run 43693826837, the merge of the release PR #46) failed at the step "Authenticate to Google Cloud"; the `demo` environment variables were not set yet (`PROJECT_ID` and `REGION` were empty in the log, and the login action received no `workload_identity_provider`). The validation step before it did not stop the run, which PR #47 fixed. The next run succeeded.

| Item | Value |
|---|---|
| Run | "Deploy demo", [run 43818649901](https://github.com/WirachatTH/cpe334-th044-p5-approval-flow/actions/runs/43818649901), started 2026-11-16 06:42 UTC by a manual run on `main` (`workflow_dispatch`, empty `image_tag`, so it tested and built the current `main`) |
| Commit | `67d5cfd3eb5fbf8462c6836a954d83e1589aba11`, the merge of PR #46, tagged `v1.0.0-sprint1` |
| Jobs | `test / test-and-docker` passed (1 min 31 s); `deploy` passed (2 min 2 s) |
| Image | `asia-southeast1-docker.pkg.dev/cpe334-th044-p5/approval-flow/approval-flow@sha256:965a4be21f5599e7069be5c1201db5c59a694997c061984ca5dd16723c313ab0` |
| Migration | job `approval-flow-migrate`, execution `approval-flow-migrate-28pfq`, completed before the service was updated |
| Revision | `approval-flow-00003-l98`, serving 100 percent of the traffic |
| Smoke test | `/api/health`, `/api/ready`, and `/` passed. The optional sign-in check was skipped (`SMOKE_EMAIL` and `SMOKE_PASSWORD` are not configured) |

**Checked on the live URL after the first run, on 2026-11-16**, with read-only requests and no sign-in:

| Request | Result |
|---|---|
| `GET /` | 200, the HTML page (title "Approval Flow") |
| `GET /api/health` | 200, `{"status":"ok"}` |
| `GET /api/ready` | 200, `{"status":"ready","db":"connected"}` |
| `GET /api/auth/me` and `GET /api/requests/mine`, with no session | 401, `UNAUTHENTICATED`, no record data |
| The built client file the page loads | It has no `Build` footer text. This is expected: the running commit `67d5cfd` is older than F-05 v0.10 (section 6.1) |

**The second run: the release PR #59.** Merging PR #59 (`staging` into `main`) started Deploy demo by itself, with no manual step.

| Item | Value |
|---|---|
| Run | "Deploy demo", [run 43899764286](https://github.com/WirachatTH/cpe334-th044-p5-approval-flow/actions/runs/43899764286), started 2026-11-16 15:45 UTC by the push of the merge commit of PR #59 |
| Commit | `21b7135816cd4ba592247b9f0b053e2b51d5ae01`, the merge of PR #59, tagged `v1.1.0-lab5` (annotated) |
| Jobs | `test / test-and-docker` passed (1 min 32 s); `deploy` passed (1 min 51 s) |
| Image | `asia-southeast1-docker.pkg.dev/cpe334-th044-p5/approval-flow/approval-flow@sha256:24f5a6a6b59ad2ab37340e947aef253d6d500ae76e857c2a8414b76859c3a044` |
| Migration | job `approval-flow-migrate`, execution `approval-flow-migrate-zlb8p`, completed before the service was updated |
| Revision | `approval-flow-00004-rq6`, serving 100 percent of the traffic (the one before it was `approval-flow-00003-l98`) |
| Deployed by | `approval-flow-deployer` (the service's last modifier, read in Cloud Shell) |
| Smoke test | `/api/health`, `/api/ready`, and `/` passed; the optional sign-in check was skipped, as before |

**What the checks showed**

- **C-04** (the domain workflow on the live URL): on the public URL, signed in as seeded accounts, Ploy submitted `REQ-000003` ("Lab5 live check A") to Mint, Mint approved it with a reason, and Ploy saw it as Approved with the decision and the history. This was done by hand; the approve path only, not the reject path.
- **C-05** (a record survives a redeploy): `REQ-000004` ("Lab5 persistence B") was created and left Submitted on revision `approval-flow-00003-l98`. After the deploy of `approval-flow-00004-rq6`, Ploy's list held the same four requests with the same statuses, and Mint then approved `REQ-000004` on the new revision. The data is in Cloud SQL, not in the container.
- **C-06** (a reviewed change goes `staging` to `main` to Cloud Run, and the running revision shows the release commit): the public Login page and every signed-in screen show `Build 21b7135`, the first 7 characters of the release commit. In Cloud Shell, the image digest of revision `approval-flow-00004-rq6` is the digest of the image tagged `21b7135816cd4ba592247b9f0b053e2b51d5ae01`.

**Not covered:** the reject path on the live URL; a sign-in in the pipeline's smoke test (`SMOKE_EMAIL` and `SMOKE_PASSWORD` are not configured); a rollback and a roll-forward on the live service (section 6.2 is not yet run); the Cloud SQL, Secret Manager, and Workload Identity names against the Console; and the budget (Issue #1).

## 7. Cost control

- Alerts-only budget, created before any resource: _written when Issue #1 is done_
- Cloud Run: minimum 0 instances, maximum 3 (set in `deploy/deploy.sh`)
- Cloud SQL: `db-f1-micro`, 10 GB SSD, storage auto-increase off (set in `deploy/deploy.sh`)
- Pause the database when idle (Student Guide Episode 9): `gcloud sql instances patch approval-flow-pg --activation-policy=NEVER`, and `ALWAYS` to resume. **No teardown before grading ends:** `deploy/teardown.sh` is never run until the instructor says grading is over.
