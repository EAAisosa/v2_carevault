# Agent Instructions

The canonical instructions for any AI coding agent working on this repository
live in **[CLAUDE.md](./CLAUDE.md)**. Read that file first.

This `AGENTS.md` exists because different agent tools look for different
filenames — Claude Code auto-loads `CLAUDE.md`, several other tools look for
`AGENTS.md`. Both refer to the same rules.

## Required reading before touching code

1. [CLAUDE.md](./CLAUDE.md) — load-bearing rules: documentation requirements,
   access control, auth model, frontend/backend conventions, completion checklist.
2. [README.md](./README.md) — quick start, env vars, endpoint list.
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — system map and the *why* behind the
   technical choices.
4. [apps/web/src/api/README.md](./apps/web/src/api/README.md) — the frontend
   API hook pattern (one file per hook, per-domain folders).

## The non-negotiables

- **This is PHI.** NDPA 2023 + GAID 2025 compliance is not optional.
- **Documentation ships with the code**, not in a follow-up. See the
  "Documentation is mandatory" section in [CLAUDE.md](./CLAUDE.md) for the
  table of what-to-update-when.
- **Two-layer access control** (route + service). Never trust the route layer
  alone for tenant isolation.
- **No raw `useEffect` data fetching** on the frontend — use hooks from
  `apps/web/src/api/`.
- **No `window.confirm()`** for destructive actions — use `useConfirm()`.
- **No plaintext credentials** anywhere (request, response, log, audit row).
- **Run `npm test` and `npm run typecheck` before declaring a task done.**

Everything else is in CLAUDE.md.
