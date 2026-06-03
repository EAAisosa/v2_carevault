# CareVault Architecture

This document is the canonical map of the codebase. If you're new to the
repository or auditing a change, start here.

## What CareVault is

A national health-record integration platform for Nigeria (NHRIRP). It pulls
patient records from hospital EHR systems (OpenMRS, Bahmni, DHIS2) over **FHIR
R4**, stages them for admin review, and surfaces a unified longitudinal record
to clinicians, with separate de-identified access for researchers.

This is **PHI**. NDPA 2023 + GAID 2025 compliance is non-negotiable. Every
patient record view and search is logged. EHR credentials are encrypted at rest.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Web | **Next.js 14** (App Router, RSC opt-out) | Modern React, file-system routing, hosting-agnostic. |
| API | **Express 4 + TypeScript** | Boring, well-understood, fully typed. |
| DB | **PostgreSQL 16** + **Prisma 6** | Single source of truth for schema; migrations live in `packages/db`. Will run on AWS RDS in production — Prisma is portable, no Postgres-only extensions used. |
| Auth | **JWT** (HS256, 8h access) + **rotating refresh tokens in httpOnly cookie** | OAuth 2.0 BCP for SPAs. Short-lived access in memory, long-lived refresh hidden from JS. |
| Server state | **TanStack Query (React Query)** | Caching, deduping, refetch, request cancellation — all free. No hand-rolled `useEffect` data fetching. |
| Encryption | **AES-256-GCM** (`node:crypto`) | Portable; no pgcrypto dependency; rotatable. |
| Tests | **Vitest** | Native TS+ESM; same `describe/it/expect` API as Jest; faster. |
| Monorepo | **Turborepo** + **npm workspaces** | Parallel tasks, cached builds, single lockfile. |
| Language | **TypeScript 5.9** | `moduleResolution: Node16` (non-deprecated); strict mode in shared `@repo/config/tsconfig/base`. |
| CI | **GitHub Actions** | `npm ci → db:generate → typecheck → test → build`. |

## Repository layout

```text
apps/
  api/                       Express + Prisma backend (see "API layering" below)
  web/                       Next.js frontend
packages/
  config/                    Shared tsconfig base configs (consumed by every workspace)
  db/                        Prisma schema, generated client, seed script — the ONE Prisma singleton
  fhir/                      FHIR R4 client + bundle mappers (consumed by apps/api)
  types/                     Cross-app TypeScript types (AppRole, DTOs)
.github/workflows/ci.yml     CI pipeline
ARCHITECTURE.md              This file
CLAUDE.md                    Codebase rules for AI assistants
```

## API layering (`apps/api/src/`)

Strict three-tier separation. Don't shortcut.

```text
routes/        → express.Router; mounts authenticate + requireRole; one file per resource
controllers/   → parse req (zod), call service, render res; thin
services/      → business logic + prisma; all access-control checks happen here
lib/           → cross-cutting infra (prisma re-export, crypto, cookies, logger)
middleware/    → authenticate, requireRole, errorHandler, correlationId, rateLimiter
```

`controllers/` never touch `prisma` directly. `services/` never touch `req`/`res`.

### The Prisma singleton

`packages/db/src/client.ts` instantiates one `PrismaClient` per process (with
the standard `globalThis` guard so `tsx watch` hot-reload doesn't leak
connections). `apps/api/src/lib/prisma.ts` re-exports it. **Do not
`new PrismaClient()` anywhere else.**

## Authentication & session management

```text
Browser                            API                          DB
  │  POST /auth/login (creds)       │                            │
  ├────────────────────────────────►│  bcrypt.compare            │
  │                                 ├───────────────────────────►│
  │  200 + Set-Cookie: refresh      │  insert refresh_tokens     │
  │  body: { accessToken, user }    │◄───────────────────────────┤
  │◄────────────────────────────────┤                            │
  │                                 │                            │
  │  GET /patients/123              │                            │
  │  Authorization: Bearer <access> │                            │
  ├────────────────────────────────►│  jwt.verify (HS256)        │
  │                                 │  prisma.profile.findUnique │
  │                                 ├───────────────────────────►│
  │  200 + audit log written        │                            │
  │◄────────────────────────────────┤                            │
  │                                 │                            │
  │  ── access token expires ──     │                            │
  │  GET /patients/124 → 401        │                            │
  │  POST /auth/refresh             │                            │
  │  (cookie sent automatically)    │                            │
  ├────────────────────────────────►│  rotate refresh token      │
  │  200 + new Set-Cookie + access  ├───────────────────────────►│
  │◄────────────────────────────────┤                            │
  │  retry original request         │                            │
```

### Why this shape

| Token | Where | Lifetime | XSS risk | CSRF risk |
|---|---|---|---|---|
| Access | JS memory (React state) | 8 h | Reading possible; theft window bounded by TTL | None (Bearer header, not auto-sent) |
| Refresh | httpOnly cookie, `SameSite=Lax`, `Path=/api/v1/auth` | 30 d | **Unreachable from JS** | Mitigated by `SameSite=Lax` + path scoping + origin allowlist |

### Refresh-token reuse detection

`apps/api/src/services/auth.service.ts::refreshSession`. Rotated tokens are
marked `revokedAt`. If a *revoked* token is ever presented, that's a theft
signal — we revoke the user's entire chain and the legitimate user is forced
to log in again. (`auth.service.test.ts` covers this.)

## Authorization

Roles are an enum on `app_role` in Postgres:
`clinician | facility_admin | carevault_admin | researcher`.

**Two-layer enforcement:**

1. **Route-level** (`middleware/requireRole.ts`) — bare minimum: this role
   can hit this endpoint at all. Tests in `requireRole.test.ts`.
2. **Service-level** (every service that takes `role` + `callerFacilityId`) —
   tenant isolation: a `facility_admin` from Hospital A cannot read Hospital B's
   patients, even though the route allows them. Tests in
   `patients.service.test.ts`.

| Role | Routes | Tenant scope |
|---|---|---|
| `clinician` | `/patients/*`, `/dashboard` | Their facility only |
| `facility_admin` | + `/users`, `/connections`, `/staging`, `/integrated` | Their facility only |
| `carevault_admin` | All of the above + `/facilities`, `/audit`, `/research-requests` | Unrestricted |
| `researcher` | `/research/*` | De-identified data only (route not yet built) |

**The frontend also enforces** via `ROUTE_ACCESS` in
`apps/web/src/app/(dashboard)/layout.tsx`. This is defence in depth — the API
is authoritative, but the UI blocks render before the fetch goes out, so a
researcher who types `/patient/abc` doesn't even send the request.

## Audit logging (NDPA)

Every read of patient data writes an `audit_logs` row. The write happens in a
`finally` block so attempted but failed access is also logged (NDPA
requirement). See `apps/api/src/controllers/patients.controller.ts`.

Actions used today: `PATIENT_SEARCH`, `RECORD_VIEW`,
`FACILITY_CONNECTION_*`, `FACILITY_STATUS_CHANGE`. Add to the same enum if you
introduce new flows.

## EHR credentials at rest

Stored as a single AES-256-GCM-encrypted column (`auth_credentials`) on
`facility_connections`. See `apps/api/src/lib/crypto.ts`.

- **Why GCM, not bcrypt?** Bcrypt is one-way; we have to decrypt these creds
  to send them to OpenMRS at sync time. GCM is symmetric and authenticated
  (tampering is detected).
- **Key**: `ENCRYPTION_KEY` env var, 32 bytes base64-encoded. Generate with
  `openssl rand -base64 32`.
- **Rotation**: generate a new key, run a one-shot script that re-encrypts
  every row with the new key, swap the env var. We don't carry a key-id today
  because there's only one encrypted column; add one if more fields adopt this.
- **Production**: move the key to AWS Secrets Manager / Parameter Store. The
  app code stays unchanged — only the env source moves.

## Frontend data layer

```text
api-client.ts     fetch wrapper. credentials: 'include'. On 401, calls onRefresh
                  via a single-flight gate, retries the original request.
useApi.ts         Returns an api-client bound to the current access token and
                  the AuthContext.refresh callback.
useApiQuery.ts    Thin wrappers around TanStack Query. ONE place to standardise
                  retries, staleTime, invalidation.
DataView.tsx      Reusable loading/error/empty UI. Pages don't reimplement.
ConfirmDialog.tsx Reusable destructive-action confirm. Provider in app/providers.tsx.
                  Replaces native window.confirm().
```

**Rule:** new data pages use `useApiQuery` + `DataView`. New mutations use
`useApiMutation` with `invalidates: [QUERY_KEY]`. No raw `useEffect` + `setState`
for fetches.

## State management decisions

| State | Mechanism | Reason |
|---|---|---|
| Server data | React Query | Built for it. Caching, dedup, refetch. |
| Auth (token, profile) | React Context (`AuthContext`) | Cross-cutting, mutates ~once per session. Right tool. |
| Page UI (filters, modals) | `useState` | Local to one page. |
| Form state | `useState` (small) / consider `react-hook-form` if forms grow | Today the forms are simple. |

**Redux Toolkit is intentionally not used.** It would be overengineering for
the current scope. Reach for it only when multiple unrelated routes need to
share a mutable client store with complex update rules.

## Local development

```bash
# 1. Install
npm install

# 2. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp packages/db/.env.example packages/db/.env

# 3. Database — first time, generate the initial migration from schema.prisma
createdb carevault
npm run db:generate -w @repo/db
npm run db:migrate:dev -w @repo/db -- --name init   # only the first time
npm run db:seed -w @repo/db

# On every subsequent machine (or in CI/prod) use migrate (no :dev):
# npm run db:migrate -w @repo/db

# 4. Run
npm run dev          # API on :4000, web on :3000

# 5. Test
npm test             # vitest in apps/api
```

Required env (see `.env.example` files for full lists):

- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — separate secrets, ≥64 chars each (`openssl rand -hex 64`)
- `ENCRYPTION_KEY` — 32-byte AES key, base64 (`openssl rand -base64 32`)
- `CRON_SECRET` — protects internal scheduler endpoints
- `ALLOWED_ORIGINS` — CORS allowlist, comma-separated
- `APP_URL` — used to build password-reset URLs

## Deployment (AWS af-south-1)

GAID 2025 requires all patient data to remain within Africa — `af-south-1` is the
only compliant AWS region.

| Component | Service |
|---|---|
| API | ECS Fargate (Node 22) behind ALB — `apps/api/Dockerfile` |
| Database | AWS RDS for PostgreSQL 16 (private subnet, encrypted, 7-day backups) |
| Web | Vercel (Next.js adapter, git-connected) |
| Secrets | AWS Secrets Manager — all app secrets under `carevault/prod/` |
| Container registry | Amazon ECR — `carevault-api` repository |
| Logs | CloudWatch — `/ecs/carevault-api` (3-month retention, pino JSON) |
| Monitoring | CloudWatch alarms: ECS CPU/memory, ALB 5xx, RDS connections/CPU |
| WAF | WAF v2 WebACL attached to ALB (AWS managed rules + IP rate limiting) |
| Scheduled sync | EventBridge rule (every 3 hours) → Lambda → `POST /sync/internal/auto-sync` |

### Infrastructure as Code

All AWS resources are defined in `infra/` (AWS CDK v2, TypeScript). Deploy order:

```bash
cd infra
npm install
cdk bootstrap aws://ACCOUNT_ID/af-south-1

# 1. Provision in dependency order
cdk deploy CareVaultNetwork
cdk deploy CareVaultData
cdk deploy CareVaultCompute --context certificateArn=arn:aws:acm:af-south-1:ACCOUNT:certificate/ID
cdk deploy CareVaultMonitoring
cdk deploy CareVaultScheduler

# 2. Populate secrets (DATABASE_URL, ENCRYPTION_KEY) from RDS outputs
bash infra/scripts/populate-secrets.sh

# 3. Run migrations before first container deployment
DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id carevault/prod/database-url --query SecretString --output text)" \
  npm run db:migrate -w @repo/db
```

### CI/CD pipeline

- `ci.yml` — runs on every push and PR: typecheck → test → build.
- `deploy.yml` — runs after CI passes on `main`: build Docker image → push ECR
  → register new ECS task definition → deploy with rollback on failure.

GitHub secrets required for deployment:

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | ARN of an IAM role with ECR push + ECS deploy permissions (GitHub OIDC) |

### First-time setup checklist

- [ ] Request ACM certificate for `api.carevaultng.com` (DNS validation via registrar)
- [ ] Run `cdk deploy` in order above with `certificateArn` context
- [ ] Run `infra/scripts/populate-secrets.sh` to set DATABASE_URL and ENCRYPTION_KEY
- [ ] Subscribe an email or PagerDuty endpoint to the `carevault-alerts` SNS topic
- [ ] Set DNS: CNAME `api.carevaultng.com` → ALB DNS from `CareVaultCompute` outputs
- [ ] Set GitHub secret `AWS_DEPLOY_ROLE_ARN`
- [ ] Verify NEXT_PUBLIC_API_URL on Vercel points to `https://api.carevaultng.com/api/v1`

DB migrations run as a one-off task (`npm run db:migrate -w @repo/db`) before
deploying the API container. **Never** run `prisma migrate dev` against production.

## Testing strategy

Today: unit + middleware tests on the critical security paths
(`crypto`, `requireRole`, `patients.service`, `auth.service`). 21 tests, sub-second.

Not yet: HTTP-level integration tests (would use `supertest`); end-to-end
browser tests (would use Playwright). Add as routes stabilise. The CI pipeline
already runs `turbo test` so adding more is a matter of writing them.

## Where things live (quick reference)

| Concern | File |
|---|---|
| Add a new API route | `apps/api/src/routes/<name>.ts` + register in `routes/index.ts` |
| Add a new DB table | edit `packages/db/prisma/schema.prisma`, `npm run db:migrate:dev -w @repo/db` |
| Add a new dashboard page | `apps/web/src/app/(dashboard)/<name>/page.tsx`, add to `ROUTE_ACCESS` |
| Add to the sidebar | `apps/web/src/components/AppLayout.tsx` `navItems` array |
| Add a destructive UI action | `useConfirm()` from `components/ConfirmDialog.tsx` |
| Encrypt a new sensitive field | `encryptJSON()` from `apps/api/src/lib/crypto.ts` |
| Add cross-app types | `packages/types/src/index.ts` |
