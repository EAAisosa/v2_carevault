-- Add unique constraint on user_roles.user_id so upsert with onConflict: "user_id" works.
-- The table may already have a PK on (id), but PostgREST/Supabase upsert requires a named
-- unique constraint on the conflict column(s) to target.
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260517000003')
  ON CONFLICT DO NOTHING;
