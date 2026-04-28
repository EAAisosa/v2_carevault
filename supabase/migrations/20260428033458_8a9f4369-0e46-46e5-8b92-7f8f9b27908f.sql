
-- 1. Fix handle_new_user to ignore self-supplied facility_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _facility_id uuid;
  _is_invited boolean;
BEGIN
  -- Only trust facility_id from metadata if user was created via admin invite
  _is_invited := NEW.invited_at IS NOT NULL;

  IF _is_invited THEN
    _facility_id := (NEW.raw_user_meta_data->>'facility_id')::uuid;
  ELSE
    _facility_id := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, facility_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _facility_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clinician'::app_role);

  RETURN NEW;
END;
$function$;

-- 2. Restrict facility admin role management
DROP POLICY IF EXISTS "Facility admins can manage facility user roles" ON public.user_roles;

-- Facility admins can only assign 'clinician' role, and never to themselves
CREATE POLICY "Facility admins manage clinician roles only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id <> auth.uid()
  AND role = 'clinician'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())
  )
);

CREATE POLICY "Facility admins update clinician roles only"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id <> auth.uid()
  AND role = 'clinician'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id <> auth.uid()
  AND role = 'clinician'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())
  )
);

CREATE POLICY "Facility admins delete clinician roles only"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id <> auth.uid()
  AND role = 'clinician'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())
  )
);

CREATE POLICY "Facility admins view facility user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id IN (
    SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())
  )
);

-- 3. Restrict facility_connections.auth_credentials column access
-- Drop the broad ALL policy and replace with split read/write
DROP POLICY IF EXISTS "Facility admins can manage own connections" ON public.facility_connections;

-- Facility admins can SELECT their connections (column-level grants restrict auth_credentials)
CREATE POLICY "Facility admins read own connections"
ON public.facility_connections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND facility_id = get_user_facility_id(auth.uid())
);

CREATE POLICY "Facility admins insert own connections"
ON public.facility_connections
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND facility_id = get_user_facility_id(auth.uid())
);

CREATE POLICY "Facility admins update own connections"
ON public.facility_connections
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND facility_id = get_user_facility_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND facility_id = get_user_facility_id(auth.uid())
);

CREATE POLICY "Facility admins delete own connections"
ON public.facility_connections
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND facility_id = get_user_facility_id(auth.uid())
);

-- Revoke column-level SELECT on auth_credentials from authenticated; only service role can read raw credentials
REVOKE SELECT (auth_credentials) ON public.facility_connections FROM authenticated, anon;

-- 4. Tighten audit insert policy
DROP POLICY IF EXISTS "Authenticated users insert own audit" ON public.research_project_audit;

CREATE POLICY "Project participants insert audit"
ON public.research_project_audit
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    has_role(auth.uid(), 'carevault_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.research_projects p
      WHERE p.id = research_project_audit.project_id
        AND p.created_by = auth.uid()
    )
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

-- 5. Revoke EXECUTE on remaining SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.is_researcher(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.researcher_has_facility_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_facility_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_any_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
