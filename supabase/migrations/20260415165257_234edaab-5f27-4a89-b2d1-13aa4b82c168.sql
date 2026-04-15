
-- 1. Migrate existing administrators to carevault_admin
UPDATE public.user_roles SET role = 'carevault_admin' WHERE role = 'administrator';

-- 2. Helper: get user's facility_id
CREATE OR REPLACE FUNCTION public.get_user_facility_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT facility_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 3. Helper: check if user is any admin role
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('facility_admin', 'carevault_admin')
  )
$$;

-- 4. Facilities RLS
DROP POLICY IF EXISTS "Admins can manage facilities" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated users can view facilities" ON public.facilities;

CREATE POLICY "CareVault admins can manage all facilities"
ON public.facilities FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can view own facility"
ON public.facilities FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians can view facilities"
ON public.facilities FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'clinician'));

-- 5. Patients RLS
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

CREATE POLICY "CareVault admins can manage all patients"
ON public.patients FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can manage own facility patients"
ON public.patients FOR ALL TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians can view patients"
ON public.patients FOR SELECT TO authenticated
USING (true);

-- 6. Staged records RLS
DROP POLICY IF EXISTS "Admins can manage staged records" ON public.staged_records;
DROP POLICY IF EXISTS "Clinicians can view staged records" ON public.staged_records;

CREATE POLICY "CareVault admins can manage all staged records"
ON public.staged_records FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can manage own staged records"
ON public.staged_records FOR ALL TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND source_facility_id = get_user_facility_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'facility_admin') AND source_facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians can view staged records"
ON public.staged_records FOR SELECT TO authenticated
USING (true);

-- 7. Facility connections RLS
DROP POLICY IF EXISTS "Admins can manage facility connections" ON public.facility_connections;
DROP POLICY IF EXISTS "Authenticated users can view connections" ON public.facility_connections;

CREATE POLICY "CareVault admins can manage all connections"
ON public.facility_connections FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can manage own connections"
ON public.facility_connections FOR ALL TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Authenticated users can view connections"
ON public.facility_connections FOR SELECT TO authenticated
USING (true);

-- 8. Sync logs RLS
DROP POLICY IF EXISTS "Admins can manage sync logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Authenticated users can view sync logs" ON public.sync_logs;

CREATE POLICY "CareVault admins can manage all sync logs"
ON public.sync_logs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can view own sync logs"
ON public.sync_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Authenticated users can view sync logs"
ON public.sync_logs FOR SELECT TO authenticated
USING (true);

-- 9. User roles RLS
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "CareVault admins can manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can manage facility user roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND user_id IN (SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'facility_admin') AND user_id IN (SELECT id FROM public.profiles WHERE facility_id = get_user_facility_id(auth.uid())));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 10. Profiles RLS
DROP POLICY IF EXISTS "Admins can delete facility profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update facility profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "CareVault admins can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'carevault_admin'))
WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins can manage own facility profiles"
ON public.profiles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- 11. Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, facility_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (NEW.raw_user_meta_data->>'facility_id')::uuid
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'clinician'));
  
  RETURN NEW;
END;
$$;
