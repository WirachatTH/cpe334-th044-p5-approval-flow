# CLAUDE.md

All rules for AI agents in this repository live in **`AGENTS.md`**, which is shared with other agent tools
and is the single source of truth. Read and follow all of it before taking any action.

@AGENTS.md

## Claude Code specifics

- Do not commit, push, open PRs, create Issues, or change GitHub/GCP settings unless a team member asks
  for it in the current session.
- When asked to commit feature work, follow `AGENTS.md` section 3: one commit per step
  (`docs` → `test` red → `feat` green). Never combine the steps into one commit.
- Never approve or merge a PR, and never edit rulesets or branch protection.
- PR descriptions follow the template's author-report style. Never add a "Generated with Claude Code" line
  to a PR, and never add a `Co-Authored-By: Claude ...` trailer to a commit.
- Never read or print `.env` files. Do not edit `private/` unless asked.
