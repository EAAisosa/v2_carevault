# Project Memory

## Core
CareVault is a read-only 'golden record' health system for Nigeria.
Supabase (project 'NHRIRP') backend with RLS and Edge Functions.
Teal and navy healthcare aesthetic. Clinical data must show provenance badges.
Three-tier RBAC: clinician, facility_admin, carevault_admin with facility-level tenant isolation.
No public registration; invite-only access.
Do not add patient consent management workflows.

## Memories
- [FHIR Compliance](mem://technical/compliance) — Platform is HL7 FHIR R4 compliant (Patient, Encounter, Observation, Condition).
- [Patient Matching](mem://identity/matching-strategy) — Deterministic matching via 11-digit NIN, probabilistic fallback via demographics.
- [Visual Direction](mem://style/visual-direction) — Healthcare aesthetic with teal/navy, CareVault logo, clinical visualizations.
- [RBAC & Audit](mem://security/access-and-audit) — Clinician/Admin roles, strict tenant isolation, comprehensive audit logs.
- [Patient Timeline UI](mem://features/patient-timeline) — Interactive timeline; clicking encounter opens details popup.
- [Incoming Records](mem://workflow/incoming-records-management) — Queue for reviewing clinical records from external facilities.
- [EHR Integration](mem://technical/integration-model) — FHIR R4 pull-based model via Edge Functions and facility_connections.
- [Authentication](mem://security/authentication) — Invite-only Supabase Auth with password recovery.
- [RBAC Schema](mem://security/rbac-database-schema) — Three-tier roles (clinician, facility_admin, carevault_admin) with tenant isolation via facility_id.
- [Patient Schema](mem://data/patient-model) — Requires blood group, genotype, and primary home facility.
- [Facility Registry](mem://features/facility-registry) — Tracks onboarding of health centers (facility_code, EHR type, status).
- [User Management](mem://features/user-management) — Manage staff via manage-users Edge Function and unified password reset.
- [EHR Sync Prototype](mem://features/ehr-sync-prototype) — Mock sync via simulate-ehr-sync Edge Function for demonstration.
- [Edge Function Auth](mem://technical/edge-function-auth-pattern) — Verify JWT claims manually via service-role client getClaims(token).
- [Session Timeout](mem://security/session-management) — 5-minute inactivity timeout with a 10s warning AlertDialog.
