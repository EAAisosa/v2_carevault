-- Clinical data tables: encounters, vital_records, medications, allergies, lab_results
-- All tables are scoped to a patient (via patient_id FK → patients.id)
-- and optionally to the facility that recorded the data.

-- ─── ENCOUNTERS ───────────────────────────────────────────────────────────────
CREATE TABLE public.encounters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL DEFAULT '',
  practitioner    text NOT NULL DEFAULT '',
  encounter_date  date NOT NULL,
  type            text NOT NULL DEFAULT 'Outpatient',
  diagnosis       text NOT NULL DEFAULT '',
  notes           text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in-progress')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── VITAL RECORDS ────────────────────────────────────────────────────────────
CREATE TABLE public.vital_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL DEFAULT '',
  recorded_date   date NOT NULL,
  systolic        integer,
  diastolic       integer,
  heart_rate      integer,
  temperature     numeric(4,1),
  weight          numeric(5,1),
  spo2            integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── MEDICATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE public.medications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL DEFAULT '',
  name            text NOT NULL,
  dosage          text NOT NULL DEFAULT '',
  frequency       text NOT NULL DEFAULT '',
  prescribed_by   text NOT NULL DEFAULT '',
  start_date      date NOT NULL,
  end_date        date,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── ALLERGIES ────────────────────────────────────────────────────────────────
CREATE TABLE public.allergies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL DEFAULT '',
  substance       text NOT NULL,
  reaction        text NOT NULL DEFAULT '',
  severity        text NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe')),
  reported_by     text NOT NULL DEFAULT '',
  date_recorded   date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── LAB RESULTS ──────────────────────────────────────────────────────────────
CREATE TABLE public.lab_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id     uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  facility_name   text NOT NULL DEFAULT '',
  test            text NOT NULL,
  result          text NOT NULL,
  unit            text NOT NULL DEFAULT '',
  reference_range text NOT NULL DEFAULT '',
  result_date     date NOT NULL,
  status          text NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'abnormal', 'critical')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX ON public.encounters(patient_id);
CREATE INDEX ON public.vital_records(patient_id);
CREATE INDEX ON public.medications(patient_id);
CREATE INDEX ON public.allergies(patient_id);
CREATE INDEX ON public.lab_results(patient_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.encounters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results   ENABLE ROW LEVEL SECURITY;

-- Authenticated users (clinicians, admins) can read all clinical data
CREATE POLICY "Authenticated users can read encounters"
  ON public.encounters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read vital_records"
  ON public.vital_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read medications"
  ON public.medications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read allergies"
  ON public.allergies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read lab_results"
  ON public.lab_results FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete clinical records
CREATE POLICY "Admins can insert encounters"
  ON public.encounters FOR INSERT TO authenticated
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update encounters"
  ON public.encounters FOR UPDATE TO authenticated
  USING (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can insert vital_records"
  ON public.vital_records FOR INSERT TO authenticated
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update vital_records"
  ON public.vital_records FOR UPDATE TO authenticated
  USING (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can insert medications"
  ON public.medications FOR INSERT TO authenticated
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update medications"
  ON public.medications FOR UPDATE TO authenticated
  USING (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can insert allergies"
  ON public.allergies FOR INSERT TO authenticated
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update allergies"
  ON public.allergies FOR UPDATE TO authenticated
  USING (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can insert lab_results"
  ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update lab_results"
  ON public.lab_results FOR UPDATE TO authenticated
  USING (public.is_any_admin(auth.uid()));
