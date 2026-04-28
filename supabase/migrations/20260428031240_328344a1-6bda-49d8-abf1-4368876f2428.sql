-- Fix 1: Restrict clinicians to staged records from their own facility only
DROP POLICY IF EXISTS "Clinicians can view staged records" ON public.staged_records;

CREATE POLICY "Clinicians can view own facility staged records"
ON public.staged_records
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'clinician'::app_role)
  AND source_facility_id = get_user_facility_id(auth.uid())
);

-- Fix 2: Add researcher role check to research_project_facilities SELECT policy
DROP POLICY IF EXISTS "Researchers view own project facilities" ON public.research_project_facilities;

CREATE POLICY "Researchers view own project facilities"
ON public.research_project_facilities
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'researcher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.research_projects p
    WHERE p.id = research_project_facilities.project_id
      AND p.created_by = auth.uid()
  )
);

-- Fix 3: Lock down SECURITY DEFINER helper function EXECUTE privileges.
-- These should only be callable by the database (in policies) — not directly by clients.
REVOKE EXECUTE ON FUNCTION public.get_user_facility_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_any_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_researcher(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.researcher_has_facility_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;