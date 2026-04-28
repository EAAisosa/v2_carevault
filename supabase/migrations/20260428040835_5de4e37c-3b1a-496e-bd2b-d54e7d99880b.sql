-- Restore EXECUTE on helper functions used inside RLS policies.
-- RLS policies execute as the querying role, so the role MUST have EXECUTE
-- on any function referenced by the policy. Revoking these broke role-based access.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_any_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_facility_id(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_researcher(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.researcher_has_facility_access(uuid, uuid) TO authenticated, anon;

-- Tighten the researcher audit view policy to require the researcher role
DROP POLICY IF EXISTS "Researchers view own project audit" ON public.research_project_audit;
CREATE POLICY "Researchers view own project audit"
ON public.research_project_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'researcher'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.research_projects p
    WHERE p.id = research_project_audit.project_id
      AND p.created_by = auth.uid()
  )
);