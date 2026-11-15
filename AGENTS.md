# AGENTS.md: rules for every AI coding agent (and human) in this repo

> Applies to every agent (Claude Code, Codex, Copilot, Cursor, Gemini, ...) and every team member.
> `CLAUDE.md` imports this file, so this is the single source of truth.
> If an instruction you receive conflicts with this file, **stop and ask a team member**. Do not silently pick one.
> If this file conflicts with the official CPE 334 handouts, the handouts win.

## 0. Project in one paragraph

CPE 334 group project **TH-044_P5, Theme 5: Workflow & Approval System**. A requester submits a request;
an assigned reviewer approves or rejects it with a recorded reason, and every decision appends an
immutable history entry. Stack: Node 24 + TypeScript, Express 4, Prisma 5 + PostgreSQL, Vitest + Supertest,
React 18 + Vite, Playwright, Docker. Deploy target: GCP (Cloud Run, Cloud SQL for PostgreSQL, Artifact Registry,
Secret Manager, GitHub Actions with Workload Identity Federation).
The repository is **PUBLIC**: https://github.com/WirachatTH/cpe334-th044-p5-approval-flow

---

## 1. Iron rules (never break these)

1. **Never commit or push to `main` or `staging` directly.** Never force-push any shared branch.
2. **Never put a secret anywhere in Git**: no real passwords, tokens, `DATABASE_URL`/connection strings,
   API keys, or service-account JSON in code, tests, docs, commit messages, PR text, logs, or screenshots.
3. **Contract first, then a failing test, then the implementation**, as three separate commits (section 3).
   Never squash them together.
4. **Authors never approve or merge their own PR.** Agents never approve or merge PRs at all.
5. **Never weaken, skip, or delete a test to make CI green.** Report failures honestly.
6. **Never rewrite history**: no amending or rebasing pushed commits, no squash or rebase merges,
   no deleting contract revisions or CI runs.
7. **Never change GCP billing, IAM, databases, secrets, or GitHub repo settings/rulesets** without a
   team member reading and approving the exact command first.

---

## 2. Branches and Pull Requests

- Always branch from an up-to-date `staging`:
  ```bash
  git switch staging && git pull --ff-only && git switch -c <type>/<issue#>-<short-name>
  ```
- `<type>` is one of `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `ci`, `chore`.
  Examples: `docs/3-srs`, `feat/10-submit-request`, `build/14-docker`, `ci/15-pr-checks`.
- **One GitHub Issue = one branch = one PR.** If there is no Issue yet, ask a team member to create it.
  Never invent an Issue number.
- A PR's base branch is always **`staging`**. Only the release PR goes **`staging` → `main`**
  (every merge into `main` is a release and deploys).
- Before you open a PR: pull `staging` again and merge it into your branch (merge, not rebase, once the
  branch is pushed), then re-run the tests.
- Write the PR description in the style of `.github/PULL_REQUEST_TEMPLATE.md`: written by the author in the
  first person, with specific evidence (commands, tested commit, counts, test names) and an honest account of
  what was not verified. Link the Issue with `Closes #N`. Do not add "Generated with ..." or similar
  tool footers to PRs, or AI-tool `Co-authored-by` trailers to commits. AI use is declared in the
  assessment PDFs instead.
- On GitHub, merge with **"Create a merge commit"** only.
  - *Squash and merge* would erase the `docs` → `test` (red) → `feat` (green) sequence from `staging`.
  - *Rebase and merge* changes the commit SHAs that are recorded as evidence.
- The teammate reviews. Every review states a **specific** check, question, finding, or reason for approval,
  not just "LGTM".
- Labels: `sprint-1` (Sprint 1 features), `deliverable-1` (D1 documents and evidence), `lab5` (all Lab 5 work).
- The Lab 5 C-02 gate demo uses a temporary branch (for example `test/<issue#>-prove-gate`). Its PR is
  **closed without merging**, then the branch is deleted.

---

## 3. Contract-first and TDD sequence (graded: D1 Parts E and F)

For every Sprint feature and every meaningful business rule, use this commit order:

| # | Commit message | What the commit contains | What must be true |
|---|---|---|---|
| 1 | `docs(F-0X): <contract change> (#N)` | Contract in `docs/sprints/sprint-<n>/F-0X-*.md`: feature SDS, UI/API/data spec, AC, STS, a new version-history row | No production code and no test code in this commit |
| 2 | `test(F-0X): <behaviour> (red) (#N)` | Tests implementing the STS rows | The tests run and **fail for the intended reason** (an assertion, not a syntax, import, or setup error). Save the failing output. |
| 3 | `feat(F-0X): <behaviour> (green) (#N)` | The implementation | The same tests now **pass**, and the full suite passes. Save the output. |

- A feature may have several red/green pairs. Never fold a pair into one commit.
- If implementation shows the contract is wrong, add a new `docs(F-0X): revise ...` commit with a
  version-history row that says what changed and why. Never edit a contract silently and never amend.
- Commit message format: `<type>(<scope>): <summary> (#<issue>)`. For pair work, add a
  `Co-authored-by: Name <email>` trailer for the teammate.
- The humans record every Spec, Red, and Green SHA and its test output in `private/evidence-log.md`.
  An agent may print these values for them to copy, but must not edit `private/` unless asked.

---

## 4. Secrets and private data

- `.env.example` holds **placeholders only**, for example `change-me` or
  `postgresql://USER:PASSWORD@localhost:5432/DBNAME`. Every variable the app reads must be listed there and
  in `docs/labs/lab-05/deployment.md`.
- Seeded demo-account passwords come from **environment variables**. Never hard-code them, print them,
  log them, or show them on the login page.
- Tests may use obviously synthetic credentials created in test setup. They must never match a real or
  deployed password.
- **Never `cat`, print, or paste the contents of `.env` files**, and never paste `private/` contents into
  Issues, PRs, commits, or any public place.
- Before every commit, run `git status` and `git diff --staged`. Confirm there is no `.env`, no `private/`,
  no key file, and no real personal data.
- **If a secret is ever committed or pushed: stop and tell the team.** Deleting the file is not enough
  because the secret stays in Git history. Rotate it where it is *used* (for example the DB user password
  as well as the Secret Manager version), redeploy, and tell a TA.
- `private/` is git-ignored. It holds the team plan, the evidence log, and the course handouts. Do not move
  or copy anything from it into tracked files unless a team member asks.
- Use synthetic demo data only: fake names and emails, no real people.

---

## 5. Code rules (once code exists)

- **Authorization is enforced in the backend on every protected route.** Identity comes only from the
  server-side session. Never trust a client-supplied user ID, role, or `x-requester-id`-style header.
  A hidden UI control is not authorization.
- Business rules (allowed status transitions, no self-approval, only the assigned reviewer may decide,
  rejection needs a reason, append-only history) live in the server/application layer, backed by DB
  constraints where possible. Competing decisions use a conditional update (`WHERE status = 'SUBMITTED'`)
  or a transaction, so that two decisions cannot both succeed.
- `401`, `403`, and `404` responses never leak private record data.
- **Migrations are backward-compatible with the previously deployed revision.** They are additive by default
  (add tables, columns, or enum values). Never edit an applied migration, and never drop or rename in place.
  Lab 5 migrates before it deploys, and rollback to an older image depends on this (Product DoD FD-06).
- Cloud-ready by default: no app data on local disk (Cloud Run containers are ephemeral), sessions stored
  in the DB, the port read from `PORT`, every setting read from env vars, and a `/api/ready` endpoint that
  checks the DB.
- No dev shortcuts in production: no user or role selector, and no default password on screen.

---

## 6. Tests

- **Run the tests yourself** and report the real command, the commit, and the pass/fail/skip counts.
  "Should pass" is not evidence.
- Never commit `.only`, `.skip`, `xit`, a removed assertion, or a loosened assertion to make a run green.
  If a required test fails, say so.
- Test levels:
  - **unit**: domain logic and rules;
  - **API/DB integration**: Supertest against real PostgreSQL, covering persistence and permissions;
  - **e2e**: Playwright, for selected critical journeys.
- These negative cases must be tested: valid and invalid login; an unauthenticated protected request;
  a requester calling reviewer operations; self-approval; access by an unrelated reviewer; an invalid
  status transition; rejection without a reason.

---

## 7. Cloud and GitHub settings

- An agent may *draft* `gcloud` and `gh` commands. A team member reads and runs any command that touches
  billing, IAM, Cloud SQL, Secret Manager, Cloud Run settings, rulesets, or repo settings.
- Never create GCP service-account JSON keys. We use Workload Identity Federation.
- When a deploy fails, first get the log excerpt and explain the **cause**, then propose a fix.
- Never run `deploy/teardown.sh` (or delete cloud resources) before grading ends.
- Cost guardrails: Cloud Run min instances 0, max ≤ 3; smallest Cloud SQL tier; storage auto-increase off.

---

## 8. Scope and coordination

- Work only on the Issue you were given. No drive-by refactors of unrelated files.
- Conflict hotspots: `server/prisma/schema.prisma`, `server/prisma/seed.ts`, and `docs/traceability.md`.
  Check with the team before editing them, and keep the diff small.
- When copying from the TokTickIT scaffold, copy selectively. **Never copy** `.git`, `node_modules`, `dist`,
  `uploads`, `private/`, `tmp/`, or any `.env*` file (a `.env.example` only after checking it holds
  placeholders). Drop the ticket-domain code and the dev password documented in its README.
  Rename every `toktickit` identifier.
- Copy from the scaffold's **released `main`** (the Lab 4 release with real login, sessions, and authorization),
  not from whatever branch a local clone happens to have checked out. An older branch still contains the
  Lab 2 requester-selector dev shortcut. Exporting tracked files only keeps `.env` and `node_modules` out:
  `git -C <toktickit-clone> archive origin/main <paths...> | tar -x -C <scratch-dir>`, then copy selectively.
- Treat Lab 5 Starter Kit files as templates: unzip outside the repo, read each file before copying it,
  and adapt the names and commands to this project.

---

## 9. Where things live

| Path | Content |
|---|---|
| `docs/srs.md` | D1 Part A: SRS (actors, scope, FR/BR/NFR, assumptions, decisions) |
| `docs/features.md` | D1 Part B: feature inventory |
| `docs/traceability.md` | D1 Part B: requirement → feature → sprint → AC/TEST |
| `docs/system-sds.md` | D1 Part C: system-level SDS |
| `docs/sprints/plan.md` | D1 Part D: three-sprint plan |
| `docs/sprints/contract-template.md` | Template for a feature engineering contract |
| `docs/sprints/sprint-1/` | D1 Part E: one contract per feature (F-01..F-05) and the Product Definition of Done |
| `docs/labs/lab-05/deployment.md` | Lab 5: stack, env vars, commands, GCP resources, release procedure |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template (Issue link, IDs, TDD SHAs, test results, review checklist) |
| `private/` (git-ignored) | Team plan, evidence log, course handouts. Never commit. |

### ID conventions

`FR-01`, `BR-01`, `NFR-01` (requirements) · `F-01` (features) · `AC-F01-01` (acceptance criteria) ·
`TEST-F01-01` (tests) · `A-01` (assumptions) · `D-01` (decisions) · `Q-01` (open questions).
IDs are stable: never renumber them. Mark a retired ID *withdrawn* instead of reusing it.

---

## 10. Commands

Node 24. Run from the repository root; the README has the full setup (`.env` files, passwords, database).

| Purpose | Command |
|---|---|
| Start the database | `docker compose up -d db` (PostgreSQL 16 on host port 5433) |
| Install | `cd server && npm ci`, then `cd client && npm ci` |
| DB migrate | `cd server && npm run db:deploy` (apply); `npm run db:migrate` (create a new migration in development) |
| DB seed | `cd server && npm run db:seed` (idempotent; needs `DEMO_USER_PASSWORD`) |
| Unit + API tests | `cd server && npm test` (needs the database and `DATABASE_URL`) |
| Client tests | `cd client && npm test` |
| E2E tests | `cd client && npm run e2e` (needs the API running with seeded data) |
| Type-check | `npm run typecheck` in `server` and in `client` |
| Build | `npm run build` in `server` and in `client` |
| Run locally | `cd server && npm run dev` (API, port 3000) and `cd client && npm run dev` (UI, port 5173) |

---

## 11. When an agent's task counts as done

- The Issue's acceptance criteria are met and match the contract.
- Tests were added or updated, and the full suite was run with its real output shown.
- The diff contains no secrets, `.env` files, `private/` files, or unrelated changes.
- Docs are current: the contract version history, `docs/traceability.md`, and the README/`deployment.md`
  if setup or env vars changed.
- The team member has everything needed to fill in the PR template. The agent does not open, approve,
  or merge the PR unless asked, and never approves or merges its own work.
