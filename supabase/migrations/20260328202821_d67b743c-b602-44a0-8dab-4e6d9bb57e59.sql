
-- Add facility_id to profiles so users belong to a facility
ALTER TABLE public.profiles ADD COLUMN facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL;

-- Allow admins to view all profiles (needed for user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));

-- Allow admins to update profiles in their facility
CREATE POLICY "Admins can update facility profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'administrator'::app_role)
  AND facility_id = (SELECT facility_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow admins to insert profiles (for invite flow via edge function, uses service role but good to have)
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Allow admins to delete profiles in their facility
CREATE POLICY "Admins can delete facility profiles"
ON public.profiles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'administrator'::app_role)
  AND facility_id = (SELECT facility_id FROM public.profiles WHERE id = auth.uid())
);

-- Update handle_new_user to accept facility_id from metadata
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
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'clinician'));
  
  RETURN NEW;
END;
$function$;
