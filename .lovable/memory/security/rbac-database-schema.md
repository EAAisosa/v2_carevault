---
name: RBAC Database Schema
description: Three-tier role system — clinician, facility_admin, carevault_admin with tenant isolation
type: feature
---
## Roles
- `clinician` — Dashboard + Patient Search (read-only)
- `facility_admin` — + Staging Queue, Integrated Records, own Facility, User Management (own facility), EHR Connections (own facility)
- `carevault_admin` — Full unrestricted access including all Facilities, Audit Logs, and cross-facility data

## Database
- `app_role` enum: `clinician | facility_admin | carevault_admin` (legacy `administrator` migrated to `carevault_admin`)
- `user_roles` table with `user_id` + `role`
- `profiles` table has `facility_id` for tenant scoping
- `get_user_facility_id()` security definer function for RLS
- `is_any_admin()` security definer function
- `has_role()` security definer function

## Frontend
- `AuthContext` exposes: `role`, `isCareVaultAdmin`, `isFacilityAdmin`, `isAnyAdmin`, `facilityId`
- `AdminRoute` component accepts `superOnly` prop for CareVault-admin-only pages
- Facilities and Audit Logs are `superOnly`; other admin pages are `any_admin`
