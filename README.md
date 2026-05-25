# CareVault — NHRIRP Platform

Nigeria's **National Health Records Integration & Repository Programme** platform. CareVault aggregates patient records from multiple hospital EHR systems (OpenMRS, Bahmni, DHIS2) via FHIR R4, stages them for admin review, and surfaces unified patient histories to clinicians — compliant with NDPA 2023 and GAID 2025.

---

## Tech Stack

| Layer            | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Frontend         | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui  |
| Backend          | Express 4 REST API — Prisma ORM, bcrypt + stateless JWT auth |
| Database         | PostgreSQL 16                                               |
| Infrastructure   | AWS af-south-1 (Cape Town) — all data stays in Africa       |
| EHR Integration  | FHIR R4 via `apps/api` sync service                         |
| Monorepo         | Turborepo + pnpm workspaces                                 |

---

## Repository Structure

```
apps/
  api/          Express 4 REST API (port 4000)
                  Prisma ORM, bcrypt + stateless JWT, role-based access control
  web/          Next.js 14 App Router
                  shadcn/ui, Tailwind CSS, localStorage token management

packages/
  types/        Shared TypeScript interfaces (@repo/types)
  db/           Prisma schema + singleton client (@repo/db)
  fhir/         FHIR R4 bundle mapping + EHR pull utilities (@repo/fhir)
  config/       Shared tsconfig / eslint / tailwind base configs (@repo/config)
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

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 running locally (or a remote Postgres instance you can connect to)

### 1 — Install dependencies

```sh
pnpm install
```

### 2 — Configure environment variables

Copy the example files and fill in your values:

```sh
cp apps/api/.env.example    apps/api/.env
cp apps/web/.env.example    apps/web/.env.local
cp packages/db/.env.example packages/db/.env
```

**`apps/api/.env`** — required variables:

| Variable             | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`       | Postgres connection string, e.g. `postgresql://user:pass@localhost:5432/carevault` |
| `JWT_SECRET`         | Strong random secret for signing access tokens (min 64 chars)                  |
| `JWT_REFRESH_SECRET` | Separate strong random secret for refresh tokens                               |
| `CRON_SECRET`        | Secret for the internal auto-sync cron endpoint                                |
| `ALLOWED_ORIGINS`    | Comma-separated frontend origins for CORS                                      |
| `APP_URL`            | Public URL of the web app (used in reset/invite links)                         |

Generate secrets with:

```sh
openssl rand -hex 64   # for JWT_SECRET and JWT_REFRESH_SECRET
openssl rand -hex 32   # for CRON_SECRET
```

**`apps/web/.env.local`** — required variables:

| Variable               | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Base URL of the Express API, e.g. `http://localhost:4000/api/v1`  |

### 3 — Set up the database

Create the database, then run Prisma migrations:

```sh
# Create the database (if it doesn't exist yet)
createdb carevault

# Run all migrations
pnpm --filter @repo/db exec prisma migrate deploy

# Generate the Prisma client
pnpm --filter @repo/db exec prisma generate
```

### 4 — Start the dev servers

```sh
pnpm turbo dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
```

Or run each separately:

```sh
pnpm --filter @repo/api dev      # Express API
pnpm --filter carevault-web dev  # Next.js frontend
```

---

## API Overview

Base path: `/api/v1`

### Auth endpoints (`/auth`)

| Method | Path                    | Description                                   |
| ------ | ----------------------- | --------------------------------------------- |
| POST   | `/auth/login`           | Email + password → access token + refresh token |
| POST   | `/auth/refresh`         | Rotate refresh token → new token pair         |
| POST   | `/auth/logout`          | Revoke refresh token                          |
| GET    | `/auth/me`              | Get current user profile                      |
| POST   | `/auth/forgot-password` | Request a password-reset link                 |
| POST   | `/auth/reset-password`  | Set new password using reset token            |

### Tokens

- **Access token**: JWT, 8-hour TTL, signed with `JWT_SECRET`
- **Refresh token**: UUID stored in `refresh_tokens` table, 30-day TTL, rotated on every use
- **Storage**: access token stored in `localStorage` (key: `carevault-auth`)

---

## Database Migrations

```sh
# Create a new migration during development
pnpm --filter @repo/db exec prisma migrate dev --name describe-your-change

# Apply pending migrations (CI / production)
pnpm --filter @repo/db exec prisma migrate deploy

# Open Prisma Studio (local DB browser)
pnpm --filter @repo/db exec prisma studio
```

---

## Build & Typecheck

```sh
# Typecheck all packages
pnpm turbo typecheck

# Build all packages
pnpm turbo build

# Build a single app
pnpm --filter @repo/api build
pnpm --filter carevault-web build
```

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
