-- Fix invited users whose role was not applied at invite time.
-- The handle_new_user trigger always defaulted to 'clinician', so any user
-- invited with a different role needs to be corrected using the role stored
-- in their auth metadata (which was set by the manage-users edge function).
UPDATE public.user_roles ur
SET role = (
  SELECT (au.raw_user_meta_data->>'role')::app_role
  FROM auth.users au
  WHERE au.id = ur.user_id
)
WHERE ur.role = 'clinician'
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ur.user_id
      AND au.invited_at IS NOT NULL
      AND au.raw_user_meta_data->>'role' IS NOT NULL
      AND au.raw_user_meta_data->>'role' <> 'clinician'
      AND au.raw_user_meta_data->>'role' <> ''
  );
