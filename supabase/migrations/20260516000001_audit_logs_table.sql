-- HIPAA-style audit log for patient data access events
CREATE TABLE public.audit_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name     text        NOT NULL DEFAULT '',
  role          text        NOT NULL DEFAULT 'clinician',
  action        text        NOT NULL,           -- PATIENT_SEARCH | RECORD_VIEW | BREAK_GLASS_ACCESS …
  resource      text        NOT NULL DEFAULT '',-- e.g. "Patient/NIN:12345" or "Patient/id:uuid"
  facility_id   uuid        REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name text        NOT NULL DEFAULT '',
  ip_address    text        NOT NULL DEFAULT '—',
  status        text        NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.audit_logs(user_id);
CREATE INDEX ON public.audit_logs(action);
CREATE INDEX ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert their own audit rows
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins can read audit logs
CREATE POLICY "Admins can read all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()));
