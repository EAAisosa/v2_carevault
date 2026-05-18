-- ============================================================
-- Auto-sync Scheduler via pg_cron + pg_net
--
-- pg_cron fires every 3 hours. pg_net POSTs to the auto-sync
-- edge function, authenticated by a pre-shared CRON_SECRET
-- (never the service role key — that stays inside the edge function).
--
-- Pre-requisites (set by ops before applying):
--   ALTER DATABASE postgres SET app.settings.supabase_url     = 'https://your-project.supabase.co';
--   ALTER DATABASE postgres SET app.settings.cron_secret      = '<random-256-bit-hex>';
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant pg_cron usage to postgres role (already default on self-hosted Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── Schedule: fire every 3 hours ───────────────────────────
-- On first run this creates the job; re-running the migration is idempotent
-- because we use cron.unschedule first.
SELECT cron.unschedule('auto-ehr-sync') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-ehr-sync'
);

SELECT cron.schedule(
  'auto-ehr-sync',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url', true)
               || '/functions/v1/auto-sync',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'X-Cron-Secret',  current_setting('app.settings.cron_secret', true)
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260518000002')
  ON CONFLICT DO NOTHING;
