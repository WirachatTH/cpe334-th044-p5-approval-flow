# Approval Flow

CPE 334 group project TH-044_P5, Theme 5: **Workflow & Approval System**.

A department's purchase and funding requests: a requester submits a request to a reviewer they choose, the assigned
reviewer approves or rejects it with a recorded reason, and every decision leaves a permanent history entry.
Nobody can decide their own request.

> **Status: Sprint 1 in progress.** The database, the seeded demo accounts, configuration loading, and the
> `/api/health` and `/api/ready` endpoints work (F-05). Sign-in, sign-out, sessions, and role-based access work
> (F-01, F-02), and so does submitting a request and viewing your own requests (F-03). A reviewer can see their
> inbox and approve or reject a request with a recorded reason (F-04).

**Stack:** Node 24 + TypeScript, Express 4, Prisma 5 + PostgreSQL 16, React 18 + Vite, Vitest + Supertest,
Playwright, Docker.

## Prerequisites

- **Node 24** (`node --version` should print `v24.x`) and npm
- **Docker Desktop**, running, for the local PostgreSQL database

## Setup

Run the commands from the repository root. On Windows, use Git Bash, or replace `cp` with `Copy-Item`.

1. **Create your local settings.** The copies are git-ignored; never commit them.
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```
2. **Choose your own passwords** (never reuse a real one):
   - In `.env`, set `POSTGRES_PASSWORD`.
   - In `server/.env`, put the **same** password into `DATABASE_URL` (replace `change-me`), and set
     `DEMO_USER_PASSWORD` (10 to 128 characters, with a letter and a digit). It is the password of the four demo
     accounts below, and it is never printed.
3. **Start the database** (PostgreSQL 16 in Docker, on host port **5433** so it does not clash with a local
   PostgreSQL on 5432):
   ```bash
   docker compose up -d db
   ```
4. **Install, migrate, and seed:**
   ```bash
   cd server
   npm ci
   npm run db:deploy      # apply the migrations
   npm run db:seed        # create or refresh the demo accounts (safe to run again)
   cd ../client
   npm ci
   ```
5. **Run the app** (two terminals):
   ```bash
   cd server && npm run dev      # API on http://localhost:3000
   cd client && npm run dev      # UI on http://localhost:5173
   ```
   Check the API: `http://localhost:3000/api/health` answers `{"status":"ok"}`, and
   `http://localhost:3000/api/ready` answers `{"status":"ready","db":"connected"}` once the database is up.

### If a port is already in use

The defaults are **5433** (database), **3000** (API), and **5173** (UI). Another project on your computer may
already use one of them.

- **Database:** change `POSTGRES_PORT` in `.env`, and the port inside `DATABASE_URL` in `server/.env`, to match.
- **API:** set `PORT` in `server/.env`, and `API_PROXY_TARGET=http://localhost:<port>` in `client/.env`, so the UI
  still finds it.
- **UI:** the UI's address must be in `CLIENT_ORIGINS` in `server/.env` (default `http://localhost:5173`). If Vite
  starts on another port, add that address there.

Check what answers before you trust a result: `/api/health` of this project returns exactly `{"status":"ok"}`.

## Demo accounts

The seed creates four synthetic accounts. All use the password you set as `DEMO_USER_PASSWORD`.

| Name | Email | Role |
|---|---|---|
| Ploy Srisawat | `ploy.requester@example.com` | Requester |
| Nattapong Kaewdee | `nattapong.requester@example.com` | Requester |
| Mint Chaiyaporn | `mint.reviewer@example.com` | Reviewer |
| Korn Thanakit | `korn.reviewer@example.com` | Reviewer |

Two of each role make the access rules demonstrable: a second requester for ownership, and a second reviewer for an
unrelated reviewer. Share the password with other people privately, never in the repository.

## Run the whole application in containers

One image holds the API and the built UI (the root `Dockerfile`). To run it with its database:

1. In `.env`, replace the placeholders `POSTGRES_PASSWORD` and `DEMO_USER_PASSWORD` with your own values.
   If port 3000 is taken, set `APP_PORT` and make `CLIENT_ORIGINS` the address you will open, for example
   `http://localhost:3200`. It must match exactly, or every sign-in answers 403.
2. Run `docker compose --profile app up --build`. It starts the database, applies the migrations and seeds the demo
   accounts in a one-shot job, and then starts the application.
3. Open `http://localhost:<APP_PORT>` and sign in with a demo account.

`docker compose --profile app rm -sf app migrate` stops the application and keeps the database.

The image runs with `NODE_ENV=production`, so the session cookie is `Secure`. Chrome, Edge, and Firefox keep it on
`http://localhost`, but Safari does not, so there a sign-in seems to work and the next page is signed out. Use another
browser for the local container. On Cloud Run the address is `https`, so this does not apply there.

## Tests and build

| What | Command | Needs |
|---|---|---|
| Server unit, API, and database tests | `cd server && npm test` | the database running and `server/.env` (or `DATABASE_URL` in your shell) |
| Client tests | `cd client && npm test` | nothing else |
| End-to-end tests (Playwright) | `cd client && npm run e2e` | the API running on seeded data, with `CLIENT_ORIGINS` including `http://localhost:5174`; Playwright's dev server uses that port, and `API_PROXY_TARGET` must point at your API |
| Type-check | `npm run typecheck` in `server` and in `client` | |
| Build | `npm run build` in `server` and in `client` | |

The server tests create throwaway PostgreSQL schemas inside the development database and drop them afterwards; they
never touch the data in schema `public`.

Importing `@prisma/client` loads `server/.env` into every Node process, so a local `.env` counts as configuration.
A variable that is already set in your shell wins over `.env`.

## Documentation

| Document | Content |
|---|---|
| [`docs/srs.md`](docs/srs.md) | Requirements: actors, scope, FR, BR, NFR, decisions |
| [`docs/system-sds.md`](docs/system-sds.md) | Architecture, data model, API, access rules, deployment design |
| [`docs/sprints/`](docs/sprints/) | The three-sprint plan and the Sprint 1 feature contracts and Definition of Done |
| [`docs/labs/lab-05/deployment.md`](docs/labs/lab-05/deployment.md) | Every environment variable, commands, and the release procedure |
| [`AGENTS.md`](AGENTS.md) | How the team and its AI agents work: branches, PRs, test-first commits, secrets |

## Working on this repository

Branch from `staging` (`type/<issue#>-short-name`), open a PR into `staging`, and have your teammate review it.
Never commit to `main` or `staging` directly, and never commit a secret. See `AGENTS.md`.
