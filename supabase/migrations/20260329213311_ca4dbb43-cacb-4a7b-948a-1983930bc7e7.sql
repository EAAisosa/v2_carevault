
CREATE TABLE public.staged_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  nin text NOT NULL,
  source_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  source_facility_name text NOT NULL,
  data_type text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs-review')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  summary text NOT NULL,
  practitioner text NOT NULL,
  conflict_type text,
  flagged boolean NOT NULL DEFAULT false,
  admin_notes text,
  fhir_resource_type text,
  fhir_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staged_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage staged records"
  ON public.staged_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Clinicians can view staged records"
  ON public.staged_records FOR SELECT TO authenticated
  USING (true);
