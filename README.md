# CareVault — NHRIRP Platform

Nigeria's **National Health Records Integration & Repository Programme** platform. CareVault aggregates patient records from multiple hospital EHR systems (OpenMRS, Bahmni, DHIS2) via FHIR R4, stages them for admin review, and surfaces unified patient histories to clinicians — compliant with NDPA 2023 and GAID 2025.

---

## Tech Stack

| Layer            | Technology                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| Frontend         | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query       |
| Backend          | Express 4 REST API — Prisma 6, JWT access in memory + refresh in httpOnly cookie |
| Database         | PostgreSQL 16 (production: AWS RDS)                                              |
| At-rest crypto   | AES-256-GCM (app layer) for EHR credentials; bcrypt(12) for passwords            |
| EHR Integration  | FHIR R4 client + bundle mappers in `@repo/fhir`                                  |
| Tests            | Vitest                                                                           |
| Monorepo         | Turborepo + npm workspaces, TypeScript 5.9                                       |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system map.

---

## Repository Structure

```text
apps/
  api/          Express 4 REST API (port 4000)
                  Prisma ORM, JWT access in memory + refresh in httpOnly cookie,
                  AES-256-GCM for EHR credentials, role-based access control
  web/          Next.js 14 App Router (port 3000)
                  shadcn/ui, Tailwind, TanStack Query, path-based role gating

packages/
  types/        Shared TypeScript interfaces (@repo/types) — consumed by both apps
  db/           Prisma schema + singleton client + seed (@repo/db)
  fhir/         FHIR R4 client + bundle mapping (@repo/fhir)
  config/       Shared tsconfig base configs (@repo/config)
```

---

## User Roles

| Role               | Access                                                                   |
| ------------------ | ------------------------------------------------------------------------ |
| `clinician`        | Read patients, encounters, vitals, medications, allergies, labs          |
| `facility_admin`   | Manage users and EHR connections for their facility                      |
| `carevault_admin`  | Full access — staging queue, audit logs, all facilities, user management |
| `researcher`       | De-identified data via approved research projects only                   |

Access is enforced at the service layer in `apps/api`.

---

## Database Schema

**Engine:** PostgreSQL 16
**ORM:** Prisma v6 (`packages/db/prisma/schema.prisma`)

### Auth tables

| Table                   | Purpose                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| `profiles`              | User accounts — email, bcrypt password hash, active flag                       |
| `user_roles`            | Role per user (`clinician`, `facility_admin`, `carevault_admin`, `researcher`) |
| `refresh_tokens`        | JWT refresh token rotation store (30-day TTL)                                  |
| `password_reset_tokens` | Password reset / invite links (time-limited, single-use)                       |

### Core tables

| Table        | Purpose                                               |
| ------------ | ----------------------------------------------------- |
| `facilities` | Connected hospitals / EHR systems                     |
| `patients`   | National patient registry (NIN as unique identifier)  |

### Clinical tables

| Table           | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `encounters`    | Patient visits (diagnosis, type, practitioner, date) |
| `vital_records` | BP, heart rate, temperature, weight, SpO2            |
| `medications`   | Active / completed / discontinued prescriptions      |
| `allergies`     | Substance, reaction, severity                        |
| `lab_results`   | Test results with reference ranges                   |

### Workflow tables

| Table                   | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `staged_records`        | Incoming FHIR data awaiting admin approval (`status = pending`)  |
| `facility_connections`  | EHR connector config per facility                                |
| `sync_logs`             | FHIR sync history and errors                                     |
| `audit_logs`            | All user/system actions (NDPA 2023 compliance requirement)       |
| `research_projects`     | Researcher data-access projects and approvals                    |

---

## Local Development

### Prerequisites

- Node.js 22+

- PostgreSQL 16 running locally (or a remote Postgres instance you can connect to)

### 1 — Install dependencies

```sh
npm install
```

### 2 — Configure environment variables

Copy the example files and fill in your values:

```sh
cp apps/api/.env.example    apps/api/.env
cp apps/web/.env.example    apps/web/.env.local
cp packages/db/.env.example packages/db/.env
```

**`apps/api/.env`** — required variables:

| Variable             | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Postgres connection string, e.g. `postgresql://user:pass@localhost:5432/carevault` |
| `JWT_SECRET`         | Strong random secret for signing access tokens (min 64 chars)                      |
| `JWT_REFRESH_SECRET` | Separate strong random secret for refresh tokens                                   |
| `ENCRYPTION_KEY`     | 32 raw bytes, base64-encoded — AES-256-GCM key for EHR credentials                 |
| `CRON_SECRET`        | Secret for the internal auto-sync cron endpoint                                    |
| `ALLOWED_ORIGINS`    | Comma-separated frontend origins for CORS                                          |
| `APP_URL`            | Public URL of the web app (used in reset/invite links)                             |

**`packages/db/.env`** also needs `DATABASE_URL` and `ENCRYPTION_KEY` so the seed
script can encrypt fixture credentials with the same key the API will decrypt them with.

Generate secrets with:

```sh
openssl rand -hex 64    # JWT_SECRET and JWT_REFRESH_SECRET
openssl rand -base64 32 # ENCRYPTION_KEY (must decode to exactly 32 bytes)
openssl rand -hex 32    # CRON_SECRET
```

**`apps/web/.env.local`** — required variables:

| Variable               | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Base URL of the Express API, e.g. `http://localhost:4000/api/v1`  |

### 3 — Set up the database

```sh
# Create the database (drop first if you want a truly clean slate)
createdb carevault

# Generate the Prisma client
npm run db:generate -w @repo/db

# First-time setup: create the initial migration from the current schema
npm run db:migrate:dev -w @repo/db -- --name init

# Subsequent setups (CI / production / additional dev machines):
npm run db:migrate -w @repo/db
```

### 4 — Seed the database (dev only)

Populates facilities, test patients, clinical records, and **three test user accounts**:

```sh
npm run db:seed -w @repo/db
```

| Email | Password | Role |
| ----- | -------- | ---- |
| `admin@carevault.ng` | `Admin1234!` | `carevault_admin` — full access |
| `clinician@luth.ng` | `Clinician1234!` | `clinician` — read patients |
| `fadmin@luth.ng` | `FAdmin1234!` | `facility_admin` — manage LUTH users |

> The seed is idempotent — safe to run multiple times.

### 5 — Start the dev servers

```sh
npm run dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
```

Or run each separately:

```sh
npm run dev -w @repo/api      # Express API
npm run dev -w carevault-web  # Next.js frontend
```

Open [http://localhost:3000](http://localhost:3000) and log in with any of the seeded accounts above.

---

## API Overview

Base path: `/api/v1`

### Auth endpoints (`/auth`)

| Method | Path                    | Description                                                                  |
| ------ | ----------------------- | ---------------------------------------------------------------------------- |
| POST   | `/auth/login`           | Email + password → access token in body, refresh token in `Set-Cookie`        |
| POST   | `/auth/refresh`         | Reads refresh cookie, rotates it, returns a new access token                  |
| POST   | `/auth/logout`          | Revokes the refresh row and clears the cookie                                 |
| GET    | `/auth/me`              | Current user profile                                                          |
| POST   | `/auth/forgot-password` | Always 200 with generic message (no email enumeration)                        |
| POST   | `/auth/reset-password`  | Set new password using reset token                                            |

### Token model (OAuth 2.0 BCP for SPAs)

| Token   | Where it lives                                                              | TTL  | XSS reachable? |
| ------- | --------------------------------------------------------------------------- | ---- | -------------- |
| Access  | React state (memory only) — sent as `Authorization: Bearer`                 | 8 h  | Yes (bounded by TTL) |
| Refresh | `Set-Cookie: carevault_refresh; HttpOnly; SameSite=Lax; Path=/api/v1/auth`  | 30 d | **No**         |

Refresh tokens **rotate on every use**. If a previously-rotated (revoked) token
is ever presented again, the user's entire refresh chain is invalidated — a
theft signal forces re-login. JWT algorithm is pinned to HS256 on both sign and verify.

---

## Database Migrations

```sh
# Create a new migration during development
npm run db:migrate:dev -w @repo/db -- --name describe-your-change

# Apply pending migrations (CI / production)
npm run db:migrate -w @repo/db

# Open Prisma Studio (local DB browser)
npm run db:studio -w @repo/db
```

---

## Build, Typecheck & Test

```sh
# Typecheck all packages
npm run typecheck

# Run tests (vitest in apps/api: crypto, RBAC, facility scoping, auth flow)
npm run test

# Watch mode for the API tests
npm run test:watch -w @repo/api

# Build all packages
npm run build

# Build a single app
npm run build -w @repo/api
npm run build -w carevault-web
```

CI runs the full pipeline on every push and PR to `main`:
`npm ci → db:generate → turbo typecheck → turbo test → turbo build`
(see [.github/workflows/ci.yml](./.github/workflows/ci.yml)).

---

## Compliance

| Requirement          | Implementation                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| **NDPA 2023**        | Every patient record view and search is logged to `audit_logs`                                            |
| **GAID 2025**        | All data stored in AWS af-south-1 (Africa)                                                                |
| **FHIR R4**          | EHR ingestion via sync service; records land in `staged_records` (pending) and require admin approval     |
| **Auth**             | Access tokens expire after 8 hours; refresh tokens rotate on use (30-day TTL); min 12-character passwords |
| **Researcher access**| De-identified views only; re-identification attempts violate the data use agreement                       |

---

## Git Workflow

- Branch from `main` for all features
- Commit Prisma migrations separately from application code changes
- **Never commit `.env` files** — use `.env.example` as a template; fill real values locally or in AWS Secrets Manager
- All real secrets live in `.env` files (gitignored) or AWS Secrets Manager
