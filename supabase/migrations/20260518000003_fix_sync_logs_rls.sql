-- Fix sync_logs manage policy: role was renamed from 'administrator' → 'carevault_admin'
DROP POLICY IF EXISTS "Admins can manage sync logs" ON public.sync_logs;

CREATE POLICY "Admins can manage sync logs"
ON public.sync_logs
FOR ALL
TO authenticated
USING     (is_any_admin())
WITH CHECK (is_any_admin());

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260518000003')
  ON CONFLICT DO NOTHING;
