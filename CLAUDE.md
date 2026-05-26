# CareVault — CLAUDE.md

This file guides Claude Code when working autonomously on the CareVault codebase.

## What This Project Is

CareVault is Nigeria's **NHRIRP** (National Health Records Integration & Repository Programme) platform — a national health record aggregation system. It pulls patient records from multiple hospital EHRs (OpenMRS, Bahmni, DHIS2) via FHIR R4, stages them for admin review, and surfaces unified patient histories to clinicians.

**This is health data. NDPA 2023 + GAID 2025 compliance is non-negotiable.**

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Self-hosted Supabase (PostgreSQL 16, GoTrue auth, PostgREST, Edge Functions in Deno)
- **Infrastructure**: AWS af-south-1 (Cape Town) — all data stays in Africa
- **EHR Integration**: FHIR R4 via `supabase/functions/ehr-connector`

## Repository Structure

```
src/
  pages/          # Route-level components
  components/     # Shared UI components
  contexts/       # AuthContext — roles: clinician | facility_admin | carevault_admin | researcher
  integrations/
    supabase/     # Generated Supabase client + types
  data/
    mockData.ts   # ⚠️ DEPRECATED — only type definitions remain useful
supabase/
  migrations/     # All DB schema changes go here as timestamped SQL files
  functions/      # Deno edge functions
infra/
  aws-cape-town/  # Terraform + Docker Compose for production deployment
```

## Database Tables (Supabase / PostgreSQL)

### Core
- `profiles` — user profile, linked to `facilities`
- `user_roles` — role per user (app_role enum)
- `facilities` — connected hospitals/EHR systems
- `patients` — national patient registry (NIN as unique identifier)

### Clinical (added in `20260516000000_clinical_tables.sql`)
- `encounters` — patient visits
- `vital_records` — BP, HR, temp, weight, SpO2
- `medications` — active/completed/discontinued prescriptions
- `allergies` — substance, reaction, severity
- `lab_results` — test results with reference ranges
- `audit_logs` — all user/system actions (NDPA requirement)

### Workflow
- `staged_records` — incoming FHIR data awaiting admin approval
- `facility_connections` — EHR connector config per facility
- `sync_logs` — FHIR sync history and errors
- `research_projects` / `research_project_facilities` / `research_project_audit` — researcher data access

## User Roles & Access

| Role | Access |
|------|--------|
| `clinician` | Read patients, encounters, vitals, meds, allergies, labs |
| `facility_admin` | Manage users + connections for their facility only |
| `carevault_admin` | Full access, staging queue, audit logs, all facilities |
| `researcher` | De-identified data via approved research projects only |

All enforced at DB level via Row-Level Security. Never bypass RLS.

## Key Rules When Making Changes

### Database
- All schema changes = new migration file in `supabase/migrations/`
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Every new table must have RLS enabled and policies for all four roles
- Never use `DROP TABLE` or `DROP COLUMN` in migrations — use soft deletes or nullable additions
- Use `get_user_facility_id()`, `has_role()`, `is_any_admin()` helper functions in RLS policies

### Frontend
- **Never import from `src/data/mockData.ts`** — that file is deprecated. All data comes from Supabase
- Always show loading states with `<Loader2>` from lucide-react
- Always show empty states with a helpful message when DB returns zero rows
- Use `useAuth()` from `@/contexts/AuthContext` for role checks — never hardcode role strings in UI
- Patient data is **read-only** for clinicians — enforce with `<Shield>` badge and no edit UI

### Compliance
- Every patient record view must create an `audit_logs` insert: action `RECORD_VIEW`, resource `Patient/{id}`
- Every patient search must log: action `PATIENT_SEARCH`
- Researcher access goes through `patients_deidentified` view — never raw `patients` table
- Auth sessions expire after 8 hours (configured in GoTrue)
- Passwords minimum 12 characters

### FHIR Integration
- The `ehr-connector` edge function accepts FHIR R4 bundles
- All incoming records land in `staged_records` with `status = 'pending'`
- NIN is extracted from `identifier[].system = "urn:ng:nin"`
- Never auto-approve staged records — always require admin review

## Current Priorities

1. **Wire audit logging** — add `prisma.auditLog.create(...)` calls in PatientSearch and PatientSummary on every view/search event
2. **Active FHIR sync scheduler** — build a scheduled endpoint in `apps/api` that polls `facility_connections` and triggers the sync service on `sync_interval_minutes` cadence
3. **NIN ↔ MRN matching** — when a staged record's NIN doesn't match any `patients` row, implement fuzzy matching on name + DOB + phone before creating a new patient record
4. **Infrastructure** — owner will wire their own DB + deployment when ready

## Running Locally

```bash
npm install

# Copy and fill in env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp packages/db/.env.example packages/db/.env

# Set up the database
createdb carevault
npm run db:migrate -w @repo/db
npm run db:generate -w @repo/db
npm run db:seed -w @repo/db       # creates test users + sample data

# Start both servers
npm run dev
# API → http://localhost:4000
# Web → http://localhost:3000
```

Required env vars — `apps/api/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/carevault
JWT_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
ALLOWED_ORIGINS=http://localhost:3000
APP_URL=http://localhost:3000
```

Required env vars — `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Deployment

Infrastructure is owner-managed. When ready:

- Database: PostgreSQL 16, run `npm run db:migrate -w @repo/db` against the production DB
- API: build with `npm run build -w @repo/api`, run `node dist/index.js` (set `NODE_ENV=production`)
- Web: build with `npm run build -w carevault-web`, deploy `.next/` output

## Git Workflow

- Branch from `main` for features
- Commit migrations separately from code changes
- Never commit secrets — use `.env.local` (gitignored) or AWS Secrets Manager
- The GitHub PAT in the clone URL is sensitive — rotate it after use
