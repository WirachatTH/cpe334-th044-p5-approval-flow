# AI-use declaration

> For Deliverable 1 (Part F) and Lab 5. Each member writes their own entries; the other member reviews them.
> The rules for agents are in [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md): AI use is declared here,
> not in commit trailers or PR footers. Full prompt transcripts are not included.
> Status: Menelaus122's entries written (15 Nov 2026); **WirachatTH's entries are still to be written by WirachatTH.**

## How AI was used, in short

- **Tool:** Claude Code (Anthropic's command-line agent), run by Menelaus122 on their own computer, in this repository, with the
  team's rules loaded from `AGENTS.md`. It read the course handouts, wrote documents, tests, and code, ran the commands, and wrote
  the PR texts.
- **Who decided and checked:** the member set each task, kept the contract-first order (contract, failing test, passing code) as
  separate commits, read the results, and answered the reviews. The other member reviewed every PR; no PR was approved or merged by
  an agent, and no agent changed a ruleset, billing, IAM, or any GCP resource.
- **Secrets:** no password, token, key, or connection string was typed or pasted into a prompt. `.env` files stay local and
  git-ignored, and the agent was told never to print them; values from them were used through shell variables and never displayed.
  This file contains no secret and no personal data beyond the GitHub names.

## Menelaus122 (Member B)

| Period | Tool | Task (Issue / PR) | How I verified the result |
|---|---|---|---|
| 14 Nov 2026 | Claude Code | Repository hygiene, PR template, `AGENTS.md` / `CLAUDE.md` (#2, #15; PRs #13, #14, #17) | Read every file before committing; `git status` and `git diff --staged` before each commit; WirachatTH's review |
| 14 Nov | Claude Code | SRS (#3, PR #22), system SDS (#4, PRs #18, #20), Product Definition of Done (#7, PR #25) | Checked against the course handouts; edited by me; WirachatTH's reviews asked for specific revisions that became SRS v0.3 and SDS v0.4 |
| 14 Nov | Claude Code | Sprint 1 contracts F-01 to F-05 with AC and STS (#7; PRs #19, #21, #23, #24, #26) | Each AC has exactly one TEST (101 and 101, checked by a script); revised after the reviews, each revision with a version-history row |
| 14 to 15 Nov | Claude Code | F-05 foundation, Prisma schema, seed, health and readiness (#8, PR #27) | Contract, then failing tests (red), then code (green); full server suite run on a real PostgreSQL; WirachatTH's review |
| 15 Nov | Claude Code | F-01 / F-02 authentication and access control (#9, PR #28) | Red then green for each; server, client, and Playwright suites run (counts are in the PR); reviewed by WirachatTH |
| 15 Nov | Claude Code | F-03 submit and view requests (#10, PR #29) and F-04 review decision (#11, PR #30) | Red then green; the 20-round concurrency test; a temporary log (not committed) to prove the race is decided by the conditional update; reviewed by WirachatTH |
| 15 Nov | Claude Code | Part B features and traceability (#5, PR #31); release journeys (#12, PR #32); follow-ups (PR #36) | The AC to TEST to result table is generated from the contracts and from the test reports, not typed; the journeys were repeated 3 times; reviewed by WirachatTH |
| 15 Nov | Claude Code | Lab 5: production image and serving the UI from the API (#33, PR #37), CI workflow (#34, PR #38), deploy scripts and Lab 5 documentation (#35, PR #39) | Tests first for the one code change; a fresh clone was built and run in containers; the CI run on each PR; the deploy scripts only against local stubs. Nothing has been run on Google Cloud |
| 14 to 15 Nov | Claude Code | GitHub board moves, Issue closing, PR descriptions | Compared with the real state on GitHub; the descriptions follow the PR template and state what was not verified |

### AI mistakes caught, and how

| Mistake | How it was caught | Result |
|---|---|---|
| A PR note said `decided_at` and the history entry's time were "the same value" (they were not: 7 of 7 decided rows differed, up to 0.85 s, from two different clocks) | WirachatTH's review of PR #30; I then read the database | Contract v0.7, a failing test, and a fix: both use one timestamp (PR #36) |
| A PR said an environment variable (`CI`) was missing from `.env.example`; it was documented as a commented line, which my search had skipped | WirachatTH's review of PR #31 | The wrong gap was removed (`2ed615f`) |
| A reviewer id above 2,147,483,647 reached the database lookup and gave a `500` | WirachatTH's review of PR #29 | Test first, then `400 "Choose a reviewer."` (PR #36) |
| Two assertions of TEST-F04-18 could not pass with the existing screen | Writing the implementation | Fixed in a separate `test` commit before the code (`587d3e4`), stated in the PR |
| An early test (TEST-F03-09) used a raw Prisma error that hides the constraint name, so it could not check what AC-F03-09 asks | Running it | Rewritten with the `pg` driver, which returns the constraint name |
| Weak tests that passed before any code existed (a `404` from a missing route looked like a success) | Reading the red run | Each such test now has a positive control, or is listed as "passes when first written" |
| `docker build` failed at `npm ci`: the schema was copied too late for the `postinstall` step | The build itself | Schema copied before `npm ci` |
| Python bytecode (`.pyc`) was committed by mistake | I noticed it in `git status` right after the commit | Removed and ignored (`e4281f5`); it stays in the history of one commit, because rewriting pushed commits is not allowed |
| Two made-up commit hashes were typed into PR drafts | Checking every hash with `git rev-parse` before posting | Replaced with the real ones before the PRs were opened |
| An earlier cleanup stopped a process found by port number, which turned out to belong to another project's container | Reading the process list afterwards | Nothing was harmed. New rule: stop only processes I started, verified by their command line |

## WirachatTH (Member A)

_To be written by WirachatTH: the same two tables (what you used AI for, with the tool, the Issue or PR, and how you verified it; and the
mistakes you caught). If no AI tool was used for some of your work, say so here._

| Period | Tool | Task (Issue / PR) | How I verified the result |
|---|---|---|---|
| | | | |

### AI mistakes caught, and how

| Mistake | How it was caught | Result |
|---|---|---|
| | | |
