# CareVault — Agent Instructions

This file is **automatically loaded** by Claude Code (and, via `AGENTS.md`,
by other AI coding tools). Read it before touching anything. It overrides any
default agent behaviour.

If a rule below conflicts with what you'd normally do — follow the rule.

---

## What this project is

CareVault is Nigeria's **NHRIRP** (National Health Records Integration &
Repository Programme) platform. It pulls patient records from hospital EHR
systems (OpenMRS, Bahmni, DHIS2) over **FHIR R4**, stages them for admin
review, and surfaces a unified longitudinal record to clinicians.

**This is PHI. NDPA 2023 + GAID 2025 compliance is non-negotiable.**

When in doubt about whether something is safe, default to **more** logging,
**stricter** scoping, and **fewer** features — not the other way around.

---

## Read first, then write

Before changing anything substantial, read these files. They are the canonical
description of the system:

| File | What it covers |
|---|---|
| [README.md](./README.md) | Quick start, tech stack, env vars, common commands |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System map, auth flow with diagram, layering rules, deployment plan |
| [apps/web/src/api/README.md](./apps/web/src/api/README.md) | Frontend API hook pattern (one file per hook, per-domain folders) |
| [packages/db/prisma/schema.prisma](./packages/db/prisma/schema.prisma) | Database schema — source of truth |

If something is unclear from these files, ask the user. Do not guess.

---

## Documentation is mandatory

**Every feature you ship must update the docs in the same change.** Not "later",
not "in a follow-up PR" — same commit, same review.

### What counts as a documentation update

| You touched… | Update… |
|---|---|
| API surface (new endpoint, changed shape, new query param) | [README.md](./README.md) endpoint section + the relevant `apps/api/src/routes/<resource>.ts` file's top-of-file comment |
| Auth flow, token model, session policy | [ARCHITECTURE.md](./ARCHITECTURE.md) → "Authentication & session management" |
| New table, new column, new index | [README.md](./README.md) database section + a one-line comment in [packages/db/prisma/schema.prisma](./packages/db/prisma/schema.prisma) explaining *why* if it's not obvious |
| New env var | Both `.env.example` files **and** [README.md](./README.md) env table |
| New frontend hook in `apps/web/src/api/` | Re-export from the folder's `index.ts` and follow the pattern in [apps/web/src/api/README.md](./apps/web/src/api/README.md) |
| New page or route | Add to `ROUTE_ACCESS` in [apps/web/src/app/(dashboard)/layout.tsx](./apps/web/src/app/(dashboard)/layout.tsx) **and** to the sidebar in [apps/web/src/components/AppLayout.tsx](./apps/web/src/components/AppLayout.tsx) |
| New role, new permission boundary | [ARCHITECTURE.md](./ARCHITECTURE.md) → "Authorization" + corresponding service-layer test |
| Encryption, secret handling, key rotation | [ARCHITECTURE.md](./ARCHITECTURE.md) → "EHR credentials at rest" |
| Anything compliance-related (NDPA, audit, retention) | [README.md](./README.md) "Compliance" section + add an audit-log action if applicable |

### What does *not* need documentation

- Trivial refactors that don't change any external behaviour
- Internal renames that don't cross module boundaries
- Test-only changes
- Dependency bumps that don't change API

Default to writing the doc. If you skip it, you must say so explicitly in the
PR description with a one-line reason.

### Comments in code

Default to **no** code comments. Only add a comment when the *why* is
non-obvious — a hidden constraint, a subtle invariant, a workaround for a
specific bug. Never explain *what* the code does (well-named identifiers do
that). Never reference the current PR or ticket — that rots.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, **TanStack Query** |
| Backend | Express 4 + Prisma 6 |
| Database | PostgreSQL 16 (production: AWS RDS) |
| Auth | JWT access in memory (8h) + refresh in **httpOnly cookie** (30d, rotating) |
| At-rest crypto | **AES-256-GCM** for EHR credentials (app layer, not pgcrypto); **bcrypt(12)** for user passwords |
| EHR | FHIR R4 via `@repo/fhir` |
| Tests | Vitest |
| Monorepo | Turborepo + npm workspaces, TypeScript 5.9 |

There is **no Supabase**, no GoTrue, no PostgREST, no Edge Functions. Earlier
versions of this codebase used Supabase; that's all been ripped out. Treat any
reference you find to `supabase/`, `auth.users`, `service_role`, or
`get_decrypted_ehr_credentials` as stale and remove it.

---

## Repository layout

```text
apps/
  api/                       Express + Prisma backend (port 4000)
  web/                       Next.js frontend (port 3000)
packages/
  config/                    Shared tsconfig base configs
  db/                        Prisma schema + singleton client + seed
  fhir/                      FHIR R4 client + bundle mappers
  types/                     Cross-app TypeScript types
.github/workflows/ci.yml     CI pipeline
README.md, ARCHITECTURE.md   See above
```

`apps/web/src/api/` is **the only place** the frontend talks to the backend.
Pages do not call `createApiClient` directly — they import hooks from
`@/api/<resource>`.

---

## Database

- Prisma is the single source of truth for the schema.
  [packages/db/prisma/schema.prisma](./packages/db/prisma/schema.prisma).
- Schema changes go through Prisma migrations:
  `npm run db:migrate:dev -w @repo/db -- --name <description>` in development.
- One Prisma singleton lives in `@repo/db`. Re-exported via
  `apps/api/src/lib/prisma.ts`. **Never** `new PrismaClient()` anywhere else.
- Access control is enforced at the **application layer** (services), not the
  database layer. There is no RLS. Earlier docs that mention RLS, `has_role()`,
  or `is_any_admin()` Postgres helpers are stale — ignore them.

---

## User roles & access control

Two-layer enforcement, both required:

1. **Route layer** ([apps/api/src/middleware/requireRole.ts](./apps/api/src/middleware/requireRole.ts)):
   "Can this role hit this URL at all?"
2. **Service layer** (every service taking `role` + `callerFacilityId`):
   "Tenant isolation — can this user from Facility A see Facility B's data?"

| Role | URL access | Tenant scope |
|---|---|---|
| `clinician` | `/patients/*`, `/dashboard` | Own facility |
| `facility_admin` | + `/users`, `/connections`, `/staging`, `/integrated` | Own facility |
| `carevault_admin` | + `/facilities`, `/audit`, `/research-requests` | Unrestricted |
| `researcher` | `/research/*` | De-identified only (route not yet built) |

The **frontend** also gates routes via `ROUTE_ACCESS` in
[apps/web/src/app/(dashboard)/layout.tsx](./apps/web/src/app/(dashboard)/layout.tsx).
The page must not render — let alone fetch — until permission is confirmed.

When you add a new endpoint or service that handles tenant-scoped data, you
**must** add a service-layer scoping test in
`apps/api/src/services/<name>.service.test.ts`. See
[patients.service.test.ts](./apps/api/src/services/patients.service.test.ts)
for the pattern.

---

## Authentication & sessions

- Access token: HS256 JWT, 8h TTL, **in memory only** (React state). Never put
  it in `localStorage`, `sessionStorage`, or any cookie.
- Refresh token: opaque UUID stored in `refresh_tokens` table, 30d TTL,
  rotated on every use, set by API as `Set-Cookie: carevault_refresh;
  HttpOnly; SameSite=Lax; Path=/api/v1/auth`.
- Reusing a revoked refresh token revokes the user's entire chain (theft
  signal). See [auth.service.ts](./apps/api/src/services/auth.service.ts).
- JWT algorithm is **pinned to HS256** on both sign and verify. Never allow
  `none` or `RS256` confusion.

---

## Compliance (NDPA / GAID)

- Every patient-data read writes an `audit_logs` row in a `try/finally` block
  so attempted-but-failed access is logged too. See
  [patients.controller.ts](./apps/api/src/controllers/patients.controller.ts).
- Actions in use: `PATIENT_SEARCH`, `RECORD_VIEW`, `FACILITY_CONNECTION_*`,
  `FACILITY_STATUS_CHANGE`. Add new ones to the same set when introducing new
  flows; document them in this file's table above.
- Researcher access must go through a de-identified path. Never expose raw
  `patients` rows to a researcher.
- Passwords: bcrypt rounds = 12. Minimum 12 characters.
- EHR credentials at rest: AES-256-GCM via
  [apps/api/src/lib/crypto.ts](./apps/api/src/lib/crypto.ts). Key in
  `ENCRYPTION_KEY` env var, base64 of 32 bytes. Never log, never return,
  never store plaintext.

---

## Frontend rules

- **No raw `useEffect` + `setState` for data fetching.** Use a hook from
  `apps/web/src/api/<resource>`. If the hook doesn't exist, add it
  (see [apps/web/src/api/README.md](./apps/web/src/api/README.md)).
- Loading / error / empty UI: use `<DataView>` from
  [apps/web/src/components/DataView.tsx](./apps/web/src/components/DataView.tsx),
  or follow its shape. Every data page must show all three states.
- Destructive actions: use `useConfirm()` from
  [apps/web/src/components/ConfirmDialog.tsx](./apps/web/src/components/ConfirmDialog.tsx).
  Never `window.confirm()`.
- Role checks: `useAuth()` from `@/contexts/AuthContext`. Never hardcode role
  strings in JSX.
- Patient data is read-only for clinicians. No edit affordances.
- Never include PII (NIN, name, DOB, phone) in URLs — POST instead of GET.
- Never `console.log` patient IDs or error messages that include them.

---

## Backend rules

- Strict layering: `routes/` → `controllers/` → `services/` → `prisma`.
  Controllers don't touch `prisma`. Services don't touch `req` / `res`.
- All input validation via `zod` schemas in the controller.
- All access-control checks happen in the service. Don't rely on the route
  middleware alone — that only filters by role, not by facility.
- Errors throw `AppError(message, statusCode)` from
  [middleware/errorHandler.ts](./apps/api/src/middleware/errorHandler.ts).
  The error handler emits a sanitised response and never leaks Prisma error
  details in production.
- Logger: pino. Use the request logger (`req.log`), not the global logger,
  inside request handlers — it carries the correlation ID.
- Redact list lives in [apps/api/src/app.ts](./apps/api/src/app.ts). Add new
  sensitive fields there.

---

## FHIR integration

- The connector lives in `apps/api/src/services/sync.service.ts` and uses
  `@repo/fhir` for the wire protocol.
- Incoming records land in `staged_records` with `status = 'pending'`.
- NIN is extracted from `identifier[].system = "urn:ng:nin"`.
- **Never auto-approve.** All approvals are admin-triggered.

---

## Tests

- Run before you commit: `npm test` (or `npx turbo test`).
- New service that handles PHI or access control → write a test. See
  [auth.service.test.ts](./apps/api/src/services/auth.service.test.ts) for
  mocking Prisma, and [patients.service.test.ts](./apps/api/src/services/patients.service.test.ts)
  for facility-scoping tests.
- Tests use Vitest. Don't introduce Jest.

---

## Local development

See [README.md](./README.md) for the canonical setup. Quick reference:

```bash
npm install
cp apps/api/.env.example apps/api/.env       # fill in secrets, including ENCRYPTION_KEY
cp apps/web/.env.example apps/web/.env.local
cp packages/db/.env.example packages/db/.env # needs DATABASE_URL + ENCRYPTION_KEY

createdb carevault
npm run db:generate -w @repo/db
npm run db:migrate:dev -w @repo/db -- --name init   # first time only
npm run db:seed -w @repo/db

npm run dev   # API :4000, Web :3000
```

Generate secrets:

```bash
openssl rand -hex 64    # JWT_SECRET, JWT_REFRESH_SECRET
openssl rand -base64 32 # ENCRYPTION_KEY
openssl rand -hex 32    # CRON_SECRET
```

---

## Git workflow

- Branch from `main` for features. Small, focused PRs.
- Commit Prisma migrations separately from application code.
- Never commit `.env` files. `.env.example` only.
- Never commit secrets. If a real secret hits git, **rotate it** before
  cleaning the history — the value in history is compromised regardless.

---

## When you finish a change

Before declaring done, check all of the following:

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Relevant docs updated (use the table in "Documentation is mandatory" above)
- [ ] If you touched auth, access control, encryption, or audit logging — a
      test was added or extended
- [ ] No new `console.log` containing PII
- [ ] No new `useEffect` + `setState` for data fetching in the web app
- [ ] No new `window.confirm()` for destructive actions
- [ ] No `new PrismaClient()` outside of `@repo/db`
- [ ] No plaintext credentials returned in any API response
