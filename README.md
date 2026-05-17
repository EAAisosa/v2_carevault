# CareVault — NHRIRP Platform

Nigeria's **National Health Records Integration & Repository Programme** platform. CareVault aggregates patient records from multiple hospital EHR systems (OpenMRS, Bahmni, DHIS2) via FHIR R4, stages them for admin review, and surfaces unified patient histories to clinicians — all compliant with NDPA 2023 and GAID 2025.

**Live:** https://www.carevaultng.com

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Self-hosted Supabase (PostgreSQL 16, GoTrue auth, PostgREST, Deno Edge Functions) |
| Infrastructure | AWS af-south-1 (Cape Town) — all data stays in Africa |
| EHR Integration | FHIR R4 via `supabase/functions/ehr-connector` |
| Frontend Hosting | AWS Amplify (CI/CD from GitHub `main`) |

---

## Repository Structure

```
src/
  pages/          # Route-level components
  components/     # Shared UI components
  contexts/       # AuthContext — roles: clinician | facility_admin | carevault_admin | researcher
  integrations/
    supabase/     # Generated Supabase client + TypeScript types
supabase/
  migrations/     # Timestamped SQL migration files (YYYYMMDDHHMMSS_description.sql)
  functions/      # Deno edge functions (ehr-connector, manage-users, etc.)
infra/
  aws-cape-town/  # Terraform + Docker Compose for production deployment
```

---

## User Roles

| Role | Access |
|------|--------|
| `clinician` | Read patients, encounters, vitals, medications, allergies, labs |
| `facility_admin` | Manage users and EHR connections for their facility; approve research requests |
| `carevault_admin` | Full access — staging queue, audit logs, all facilities, user management |
| `researcher` | De-identified data via approved research projects only |

All access is enforced at the database level via Row-Level Security (RLS). Researchers see data only from facilities their approved projects explicitly cover.

---

## Database

**Location:** AWS af-south-1 (Cape Town, South Africa)
**Engine:** PostgreSQL 16 via self-hosted Supabase
**Project:** `xvozzsoufirdxlnnlnky.supabase.co`

### Core tables
- `profiles` — user profiles linked to facilities
- `user_roles` — role per user (`app_role` enum)
- `facilities` — connected hospitals / EHR systems
- `patients` — national patient registry (NIN as unique identifier)

### Clinical tables
- `encounters` — patient visits (diagnosis, type, practitioner, date)
- `vital_records` — BP, heart rate, temperature, weight, SpO2
- `medications` — active / completed / discontinued prescriptions
- `allergies` — substance, reaction, severity
- `lab_results` — test results with reference ranges

### Researcher access (de-identified views)
- `patients_deidentified` — demographics only, no PII
- `encounters_deidentified` — diagnoses + demographics, no PII
- `lab_results_deidentified` — test results + demographics, no PII
- `medications_deidentified` — drug names + demographics, no PII

### Workflow tables
- `staged_records` — incoming FHIR data awaiting admin approval
- `facility_connections` — EHR connector config per facility
- `sync_logs` — FHIR sync history and errors
- `research_projects` / `research_project_facilities` / `research_project_audit` — researcher data access workflow
- `audit_logs` — all user/system actions (NDPA compliance requirement)

---

## Local Development

### Prerequisites
- Node.js 18+ (via [nvm](https://github.com/nvm-sh/nvm))
- npm

### Setup

```sh
# Clone the repository
git clone https://github.com/5-Six/CareVault.git
cd CareVault

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local

# Start the dev server (connects to remote Supabase — no local mock)
npm run dev
# → http://localhost:5173
```

There is no local Supabase instance. The dev server connects directly to the remote Supabase project.

---

## Database Migrations

All schema changes go in `supabase/migrations/` as timestamped SQL files:

```sh
# Apply all pending migrations
supabase login
supabase db push --linked

# Run a specific SQL file directly (useful when migration history is out of sync)
cat supabase/migrations/<file>.sql | supabase db query --linked --file /dev/stdin
```

**Rules:**
- Never use `DROP TABLE` or `DROP COLUMN` — use soft deletes or nullable additions
- Every new table must have RLS enabled and policies for all four roles
- Commit migrations separately from code changes

---

## Production Deployment

**Frontend** — Amplify auto-deploys on every push to `main`. No manual step needed.

**Infrastructure (first-time or infra changes):**

```sh
cd infra/aws-cape-town
terraform init
terraform plan -var="db_password=$DB_PASS"
terraform apply

# Push Docker images to ECR
aws ecr get-login-password --region af-south-1 | docker login --username AWS ...
docker-compose build && docker-compose push
```

**Database migrations:**

```sh
supabase db push --linked
```

---

## Compliance

- **NDPA 2023** — every patient record view and search is logged to `audit_logs`
- **GAID 2025** — all data stored in AWS af-south-1 (Africa)
- **FHIR R4** — all EHR ingestion via the `ehr-connector` edge function; records land in `staged_records` (status = `pending`) and require admin approval before going live
- **Auth** — sessions expire after 8 hours; minimum 12-character passwords
- **Researcher access** — de-identified views only; re-identification attempts violate the data use agreement

---

## Git Workflow

- Branch from `main` for features
- Commit migrations separately from code changes
- Never commit secrets — use `.env.local` (gitignored) or AWS Secrets Manager
