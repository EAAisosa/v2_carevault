-- 1. Patients: scope clinician SELECT to own facility
DROP POLICY IF EXISTS "Clinicians can view patients" ON public.patients;
CREATE POLICY "Clinicians can view own facility patients"
ON public.patients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'clinician'::app_role)
  AND facility_id = get_user_facility_id(auth.uid())
);

-- 2. facility_connections: drop broad SELECT; admins-only via existing policies
DROP POLICY IF EXISTS "Authenticated users can view connections" ON public.facility_connections;

-- 3. sync_logs: drop broad SELECT; existing admin/facility policies remain
DROP POLICY IF EXISTS "Authenticated users can view sync logs" ON public.sync_logs;

-- 4. user_roles: prevent facility_admin from assigning carevault_admin role
DROP POLICY IF EXISTS "Facility admins can manage facility user roles" ON public.user_roles;
CREATE POLICY "Facility admins can manage facility user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE facility_id = get_user_facility_id(auth.uid())
  )
  AND role <> 'carevault_admin'::app_role
)
WITH CHECK (
  has_role(auth.uid(), 'facility_admin'::app_role)
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE facility_id = get_user_facility_id(auth.uid())
  )
  AND role <> 'carevault_admin'::app_role
);

-- 5. Harden handle_new_user: never trust role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, facility_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (NEW.raw_user_meta_data->>'facility_id')::uuid
  );

  -- Always default to clinician. Admin promotion happens via manage-users edge function.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clinician'::app_role);

  RETURN NEW;
END;
$function$;