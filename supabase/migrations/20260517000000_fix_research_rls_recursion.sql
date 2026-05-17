-- Fix infinite recursion in RLS policies for research_projects.
--
-- Root cause: a circular dependency between two policies:
--   1. research_projects "Facility admins view projects requesting their facility"
--      → EXISTS (SELECT 1 FROM research_project_facilities ...)
--   2. research_project_facilities "Researchers view own project facilities"
--      → EXISTS (SELECT 1 FROM research_projects ...)
-- When a researcher queries research_projects, PostgreSQL evaluates ALL policies
-- including the facility-admin one, which queries research_project_facilities,
-- whose researcher policy queries research_projects again → infinite loop.
--
-- Fix: introduce a SECURITY DEFINER helper that queries research_projects
-- bypassing RLS, and use it in any policy on a *child* table (facilities, audit)
-- that needs to verify project ownership.

CREATE OR REPLACE FUNCTION public.user_owns_research_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = _project_id AND created_by = _user_id
  )
$$;

-- Callable only by the DB engine inside policies, not by authenticated clients directly.
REVOKE EXECUTE ON FUNCTION public.user_owns_research_project(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── research_project_facilities ────────────────────────────────────────────

DROP POLICY IF EXISTS "Researchers view own project facilities" ON public.research_project_facilities;

CREATE POLICY "Researchers view own project facilities"
ON public.research_project_facilities
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'researcher'::app_role)
  AND user_owns_research_project(project_id, auth.uid())
);

-- ── research_project_audit ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Researchers view own project audit" ON public.research_project_audit;

CREATE POLICY "Researchers view own project audit"
ON public.research_project_audit
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'researcher'::app_role)
  AND user_owns_research_project(project_id, auth.uid())
);

-- The insert policy also had an unguarded EXISTS on research_projects; replace it.
DROP POLICY IF EXISTS "Project participants insert audit" ON public.research_project_audit;

CREATE POLICY "Project participants insert audit"
ON public.research_project_audit
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    has_role(auth.uid(), 'carevault_admin'::app_role)
    OR user_owns_research_project(project_id, auth.uid())
    OR (
      has_role(auth.uid(), 'facility_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.research_project_facilities f
        WHERE f.project_id = research_project_audit.project_id
          AND f.facility_id = get_user_facility_id(auth.uid())
      )
    )
  )
);
