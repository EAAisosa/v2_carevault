-- Give researchers SELECT access to clinical tables (encounters, lab_results, medications)
-- scoped to facilities their approved research projects cover.
-- Then expose de-identified views for each clinical domain.

-- ── RLS policies ───────────────────────────────────────────────────────────

CREATE POLICY "Researchers view encounters via approved projects"
  ON public.encounters FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'researcher'::app_role)
    AND researcher_has_facility_access(auth.uid(), facility_id)
  );

CREATE POLICY "Researchers view lab results via approved projects"
  ON public.lab_results FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'researcher'::app_role)
    AND researcher_has_facility_access(auth.uid(), facility_id)
  );

CREATE POLICY "Researchers view medications via approved projects"
  ON public.medications FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'researcher'::app_role)
    AND researcher_has_facility_access(auth.uid(), facility_id)
  );

-- ── De-identified age band helper (reused across views) ───────────────────
-- Inlined into each view to avoid an extra function dependency.

-- ── encounters_deidentified ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.encounters_deidentified
WITH (security_invoker=on) AS
SELECT
  encode(digest(p.id::text || 'carevault-research-salt', 'sha256'), 'hex') AS research_id,
  CASE
    WHEN extract(year from age(p.date_of_birth)) < 18 THEN '<18'
    WHEN extract(year from age(p.date_of_birth)) < 30 THEN '18-29'
    WHEN extract(year from age(p.date_of_birth)) < 40 THEN '30-39'
    WHEN extract(year from age(p.date_of_birth)) < 50 THEN '40-49'
    WHEN extract(year from age(p.date_of_birth)) < 60 THEN '50-59'
    WHEN extract(year from age(p.date_of_birth)) < 70 THEN '60-69'
    ELSE '70+'
  END                                    AS age_band,
  p.gender,
  p.state,
  p.blood_group,
  p.genotype,
  e.diagnosis,
  e.type                                 AS encounter_type,
  e.status                               AS encounter_status,
  to_char(e.encounter_date, 'YYYY-MM')   AS encounter_month
FROM public.patients p
JOIN public.encounters e ON e.patient_id = p.id;

-- ── lab_results_deidentified ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.lab_results_deidentified
WITH (security_invoker=on) AS
SELECT
  encode(digest(p.id::text || 'carevault-research-salt', 'sha256'), 'hex') AS research_id,
  CASE
    WHEN extract(year from age(p.date_of_birth)) < 18 THEN '<18'
    WHEN extract(year from age(p.date_of_birth)) < 30 THEN '18-29'
    WHEN extract(year from age(p.date_of_birth)) < 40 THEN '30-39'
    WHEN extract(year from age(p.date_of_birth)) < 50 THEN '40-49'
    WHEN extract(year from age(p.date_of_birth)) < 60 THEN '50-59'
    WHEN extract(year from age(p.date_of_birth)) < 70 THEN '60-69'
    ELSE '70+'
  END                                  AS age_band,
  p.gender,
  p.state,
  l.test,
  l.result,
  l.unit,
  l.reference_range,
  l.status                             AS lab_status,
  to_char(l.result_date, 'YYYY-MM')   AS result_month
FROM public.patients p
JOIN public.lab_results l ON l.patient_id = p.id;

-- ── medications_deidentified ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.medications_deidentified
WITH (security_invoker=on) AS
SELECT
  encode(digest(p.id::text || 'carevault-research-salt', 'sha256'), 'hex') AS research_id,
  CASE
    WHEN extract(year from age(p.date_of_birth)) < 18 THEN '<18'
    WHEN extract(year from age(p.date_of_birth)) < 30 THEN '18-29'
    WHEN extract(year from age(p.date_of_birth)) < 40 THEN '30-39'
    WHEN extract(year from age(p.date_of_birth)) < 50 THEN '40-49'
    WHEN extract(year from age(p.date_of_birth)) < 60 THEN '50-59'
    WHEN extract(year from age(p.date_of_birth)) < 70 THEN '60-69'
    ELSE '70+'
  END                                AS age_band,
  p.gender,
  p.state,
  m.name                             AS drug_name,
  m.status                           AS drug_status,
  to_char(m.start_date, 'YYYY-MM')   AS start_month
FROM public.patients p
JOIN public.medications m ON m.patient_id = p.id;

GRANT SELECT ON public.encounters_deidentified   TO authenticated;
GRANT SELECT ON public.lab_results_deidentified  TO authenticated;
GRANT SELECT ON public.medications_deidentified  TO authenticated;
