-- ============================================================
-- Clinical tables: encounters, vital_records, medications,
-- allergies, lab_results, audit_logs
-- All linked to patients.id; all with RLS matching patients policy
-- ============================================================

-- ── encounters ───────────────────────────────────────────────
CREATE TABLE public.encounters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL,
  practitioner    text NOT NULL,
  encounter_type  text NOT NULL,         -- Outpatient | Inpatient | Emergency
  diagnosis       text NOT NULL,
  notes           text,
  status          text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed', 'in-progress')),
  encounter_date  date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_encounters_patient ON public.encounters(patient_id);
CREATE INDEX idx_encounters_facility ON public.encounters(facility_id);
CREATE INDEX idx_encounters_date    ON public.encounters(encounter_date DESC);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CareVault admins manage all encounters"
  ON public.encounters FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'carevault_admin'))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins manage own facility encounters"
  ON public.encounters FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians view encounters"
  ON public.encounters FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'clinician'));


-- ── vital_records ─────────────────────────────────────────────
CREATE TABLE public.vital_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id   uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name text NOT NULL,
  encounter_id  uuid REFERENCES public.encounters(id) ON DELETE SET NULL,
  recorded_date date NOT NULL,
  systolic      integer,
  diastolic     integer,
  heart_rate    integer,
  temperature   numeric(4,1),
  weight        numeric(5,1),
  spo2          integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vitals_patient ON public.vital_records(patient_id);
CREATE INDEX idx_vitals_date    ON public.vital_records(recorded_date DESC);

ALTER TABLE public.vital_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CareVault admins manage all vitals"
  ON public.vital_records FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'carevault_admin'))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins manage own facility vitals"
  ON public.vital_records FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians view vitals"
  ON public.vital_records FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'clinician'));


-- ── medications ───────────────────────────────────────────────
CREATE TABLE public.medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id   uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name text NOT NULL,
  name          text NOT NULL,
  dosage        text NOT NULL,
  frequency     text NOT NULL,
  prescribed_by text NOT NULL,
  start_date    date NOT NULL,
  end_date      date,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'discontinued')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_patient ON public.medications(patient_id);
CREATE INDEX idx_medications_status  ON public.medications(status);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CareVault admins manage all medications"
  ON public.medications FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'carevault_admin'))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins manage own facility medications"
  ON public.medications FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians view medications"
  ON public.medications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'clinician'));


-- ── allergies ─────────────────────────────────────────────────
CREATE TABLE public.allergies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id   uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name text NOT NULL,
  substance     text NOT NULL,
  reaction      text NOT NULL,
  severity      text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  reported_by   text NOT NULL,
  date_recorded date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_allergies_patient  ON public.allergies(patient_id);
CREATE INDEX idx_allergies_severity ON public.allergies(severity);

ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CareVault admins manage all allergies"
  ON public.allergies FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'carevault_admin'))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins manage own facility allergies"
  ON public.allergies FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians view allergies"
  ON public.allergies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'clinician'));


-- ── lab_results ───────────────────────────────────────────────
CREATE TABLE public.lab_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL,
  encounter_id    uuid REFERENCES public.encounters(id) ON DELETE SET NULL,
  test_name       text NOT NULL,
  result          text NOT NULL,
  unit            text,
  reference_range text,
  status          text NOT NULL CHECK (status IN ('normal', 'abnormal', 'critical')),
  test_date       date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_labs_patient ON public.lab_results(patient_id);
CREATE INDEX idx_labs_date    ON public.lab_results(test_date DESC);
CREATE INDEX idx_labs_status  ON public.lab_results(status);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CareVault admins manage all lab results"
  ON public.lab_results FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'carevault_admin'))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'));

CREATE POLICY "Facility admins manage own facility lab results"
  ON public.lab_results FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'facility_admin') AND facility_id = get_user_facility_id(auth.uid()));

CREATE POLICY "Clinicians view lab results"
  ON public.lab_results FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'clinician'));


-- ── audit_logs ────────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text NOT NULL,
  actor_role   text NOT NULL,
  action       text NOT NULL,   -- PATIENT_SEARCH | RECORD_VIEW | MERGE_APPROVE | etc.
  resource     text NOT NULL,   -- e.g. "Patient/uuid" or "StagingRecord/uuid"
  facility_id  uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name text,
  ip_address   text,
  status       text NOT NULL DEFAULT 'success'
                 CHECK (status IN ('success', 'failure', 'warning')),
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor   ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action  ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only CareVault admins can read; system (service_role) writes via edge functions
CREATE POLICY "CareVault admins view all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'carevault_admin'));

-- Authenticated users can insert their own audit events
CREATE POLICY "Authenticated users insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());


-- ── updated_at triggers ───────────────────────────────────────
CREATE TRIGGER trg_encounters_updated
  BEFORE UPDATE ON public.encounters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_medications_updated
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
