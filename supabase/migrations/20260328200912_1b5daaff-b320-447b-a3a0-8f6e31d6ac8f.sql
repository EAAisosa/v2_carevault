
-- Explicit deny-by-default: only admins can modify user_roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));

-- Fix trigger: always assign 'clinician' on signup, ignore user-provided role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Always assign clinician role on signup; admin must be promoted by an existing admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clinician');
  
  RETURN NEW;
END;
$function$;
