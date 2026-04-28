-- Helper: is researcher
CREATE OR REPLACE FUNCTION public.is_researcher(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'researcher'::app_role)
$$;

-- Research projects
CREATE TABLE public.research_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  purpose text NOT NULL,
  requested_facility_ids uuid[] NOT NULL DEFAULT '{}',
  date_from date NOT NULL,
  date_to date NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft | pending_carevault | pending_facilities | approved | rejected | completed
  created_by uuid NOT NULL,
  submitted_at timestamptz,
  carevault_decision text, -- approved | rejected
  carevault_notes text,
  carevault_decided_by uuid,
  carevault_decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.research_project_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  decision_notes text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, facility_id)
);

CREATE TABLE public.research_project_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rpf_facility ON public.research_project_facilities(facility_id);
CREATE INDEX idx_rpf_project ON public.research_project_facilities(project_id);
CREATE INDEX idx_rp_creator ON public.research_projects(created_by);

-- Enable RLS
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_project_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_project_audit ENABLE ROW LEVEL SECURITY;

-- Helper: does researcher have approved access to a facility on a date
CREATE OR REPLACE FUNCTION public.researcher_has_facility_access(_user_id uuid, _facility_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.research_projects p
    JOIN public.research_project_facilities f ON f.project_id = p.id
    WHERE p.created_by = _user_id
      AND p.status = 'approved'
      AND f.facility_id = _facility_id
      AND f.status = 'approved'
  )
$$;

-- RLS: research_projects
CREATE POLICY "CareVault admins manage all projects"
  ON public.research_projects FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'carevault_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'::app_role));

CREATE POLICY "Researchers manage own projects"
  ON public.research_projects FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'researcher'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'researcher'::app_role));

CREATE POLICY "Facility admins view projects requesting their facility"
  ON public.research_projects FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'facility_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.research_project_facilities f
      WHERE f.project_id = research_projects.id
        AND f.facility_id = get_user_facility_id(auth.uid())
    )
  );

-- RLS: research_project_facilities
CREATE POLICY "CareVault admins manage all project facilities"
  ON public.research_project_facilities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'carevault_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'carevault_admin'::app_role));

CREATE POLICY "Researchers view own project facilities"
  ON public.research_project_facilities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.research_projects p WHERE p.id = project_id AND p.created_by = auth.uid()));

CREATE POLICY "Facility admins manage own facility decisions"
  ON public.research_project_facilities FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'facility_admin'::app_role)
    AND facility_id = get_user_facility_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'facility_admin'::app_role)
    AND facility_id = get_user_facility_id(auth.uid())
  );

-- RLS: audit
CREATE POLICY "CareVault admins view all audit"
  ON public.research_project_audit FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'carevault_admin'::app_role));

CREATE POLICY "Researchers view own project audit"
  ON public.research_project_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.research_projects p WHERE p.id = project_id AND p.created_by = auth.uid()));

CREATE POLICY "Facility admins view audit for their facility projects"
  ON public.research_project_audit FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'facility_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.research_project_facilities f
      WHERE f.project_id = research_project_audit.project_id
        AND f.facility_id = get_user_facility_id(auth.uid())
    )
  );

CREATE POLICY "Authenticated users insert own audit"
  ON public.research_project_audit FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_rp_updated BEFORE UPDATE ON public.research_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- De-identified patient view (HIPAA Safe Harbor)
CREATE OR REPLACE VIEW public.patients_deidentified
WITH (security_invoker=on) AS
SELECT
  encode(digest(id::text || 'carevault-research-salt', 'sha256'), 'hex') AS research_id,
  CASE
    WHEN extract(year from age(date_of_birth)) < 18 THEN '<18'
    WHEN extract(year from age(date_of_birth)) < 30 THEN '18-29'
    WHEN extract(year from age(date_of_birth)) < 40 THEN '30-39'
    WHEN extract(year from age(date_of_birth)) < 50 THEN '40-49'
    WHEN extract(year from age(date_of_birth)) < 60 THEN '50-59'
    WHEN extract(year from age(date_of_birth)) < 70 THEN '60-69'
    ELSE '70+'
  END AS age_band,
  gender,
  state,
  blood_group,
  genotype,
  facility_id,
  created_at::date AS registered_on
FROM public.patients;

-- Allow researchers to read patients table only via approved facility access
CREATE POLICY "Researchers view patients via approved projects"
  ON public.patients FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'researcher'::app_role)
    AND researcher_has_facility_access(auth.uid(), facility_id)
  );

-- Researchers need to read facilities table for project setup & display
CREATE POLICY "Researchers view facilities"
  ON public.facilities FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'researcher'::app_role));

-- Grant view access
GRANT SELECT ON public.patients_deidentified TO authenticated;