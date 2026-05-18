-- ============================================================
-- Staging → Clinical Pipeline
-- When a staged_record's status transitions to 'approved':
--   1. Find or create the patient by NIN
--   2. Map the FHIR resource to the correct clinical table
--   3. Increment the facility records_count
-- ============================================================

CREATE OR REPLACE FUNCTION public.integrate_approved_staged_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id    uuid;
  v_payload       jsonb;
  v_record_date   date;
  v_first_name    text;
  v_last_name     text;
  v_gender        text := 'Unknown';
  v_dob           date := '1900-01-01';
BEGIN
  -- Only fire when transitioning TO 'approved' for the first time
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  v_payload := COALESCE(NEW.fhir_payload, '{}'::jsonb);

  -- ── Extract patient name ──────────────────────────────────
  v_first_name := COALESCE(
    v_payload->'name'->0->'given'->>0,
    split_part(NEW.patient_name, ' ', 1),
    'Unknown'
  );
  v_last_name := COALESCE(
    v_payload->'name'->0->>'family',
    CASE WHEN array_length(string_to_array(trim(NEW.patient_name), ' '), 1) > 1
      THEN split_part(trim(NEW.patient_name), ' ', 2)
      ELSE 'Unknown'
    END
  );

  -- ── Extract gender ────────────────────────────────────────
  IF v_payload->>'gender' IS NOT NULL THEN
    v_gender := initcap(v_payload->>'gender');
  END IF;

  -- ── Extract date of birth ─────────────────────────────────
  BEGIN
    IF v_payload->>'birthDate' IS NOT NULL THEN
      v_dob := (v_payload->>'birthDate')::date;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── Derive record date (best available source) ────────────
  BEGIN
    v_record_date := COALESCE(
      (v_payload->'period'->>'start')::date,
      (v_payload->>'effectiveDateTime')::date,
      (v_payload->>'authoredOn')::date,
      (NEW.submitted_at)::date,
      CURRENT_DATE
    );
  EXCEPTION WHEN OTHERS THEN
    v_record_date := CURRENT_DATE;
  END;

  -- ── 1. Find or create patient by NIN ─────────────────────
  SELECT id INTO v_patient_id FROM public.patients WHERE nin = NEW.nin LIMIT 1;

  IF v_patient_id IS NULL AND NEW.nin IS NOT NULL AND NEW.nin <> '' THEN
    INSERT INTO public.patients (
      nin, first_name, last_name, date_of_birth, gender, facility_id
    ) VALUES (
      NEW.nin, v_first_name, v_last_name, v_dob, v_gender, NEW.source_facility_id
    )
    ON CONFLICT (nin) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_patient_id;
  END IF;

  IF v_patient_id IS NULL THEN
    RAISE WARNING 'integrate_approved_staged_record: could not resolve patient for record %, nin=%', NEW.id, NEW.nin;
    RETURN NEW;
  END IF;

  -- ── 2. Map FHIR resource to clinical table ────────────────
  CASE COALESCE(NEW.fhir_resource_type, 'Encounter')

    WHEN 'Encounter' THEN
      INSERT INTO public.encounters (
        patient_id, encounter_date, type, diagnosis,
        practitioner, facility_id, facility_name, status, notes
      ) VALUES (
        v_patient_id,
        v_record_date,
        COALESCE(NULLIF(v_payload->'class'->>'code', ''), 'outpatient'),
        COALESCE(
          NULLIF(v_payload->'reasonCode'->0->>'text', ''),
          NULLIF(NEW.data_type, ''),
          NEW.summary
        ),
        COALESCE(NULLIF(NEW.practitioner, ''), 'Unknown'),
        NEW.source_facility_id,
        NEW.source_facility_name,
        'completed',
        NEW.summary
      );

    WHEN 'Observation' THEN
      IF NEW.data_type ILIKE '%lab%' OR NEW.data_type ILIKE '%result%' THEN
        INSERT INTO public.lab_results (
          patient_id, test, result, unit, reference_range,
          result_date, status, facility_id, facility_name
        ) VALUES (
          v_patient_id,
          COALESCE(
            NULLIF(v_payload->'code'->>'text', ''),
            NULLIF(v_payload->'code'->'coding'->0->>'display', ''),
            NEW.data_type
          ),
          COALESCE(v_payload->'valueQuantity'->>'value', NEW.summary),
          COALESCE(v_payload->'valueQuantity'->>'unit', ''),
          '',
          v_record_date,
          COALESCE(NULLIF(v_payload->>'status', ''), 'final'),
          NEW.source_facility_id,
          NEW.source_facility_name
        );
      ELSE
        -- Vitals observation — extract LOINC-coded values where present,
        -- otherwise insert a row with NULLs so the record still appears.
        INSERT INTO public.vital_records (
          patient_id, recorded_date, facility_id, facility_name,
          systolic, diastolic, heart_rate, temperature, weight, spo2
        ) VALUES (
          v_patient_id,
          v_record_date,
          NEW.source_facility_id,
          NEW.source_facility_name,
          -- LOINC 8480-6 = Systolic BP
          CASE WHEN v_payload->'code'->'coding'->0->>'code' = '8480-6'
            THEN (v_payload->'valueQuantity'->>'value')::numeric::int ELSE NULL END,
          -- LOINC 8462-4 = Diastolic BP
          CASE WHEN v_payload->'code'->'coding'->0->>'code' = '8462-4'
            THEN (v_payload->'valueQuantity'->>'value')::numeric::int ELSE NULL END,
          -- LOINC 8867-4 = Heart rate
          CASE WHEN v_payload->'code'->'coding'->0->>'code' = '8867-4'
            THEN (v_payload->'valueQuantity'->>'value')::numeric::int ELSE NULL END,
          -- LOINC 8310-5 = Body temperature
          CASE WHEN v_payload->'code'->'coding'->0->>'code' = '8310-5'
            THEN (v_payload->'valueQuantity'->>'value')::numeric ELSE NULL END,
          -- LOINC 29463-7 = Body weight
          CASE WHEN v_payload->'code'->'coding'->0->>'code' = '29463-7'
            THEN (v_payload->'valueQuantity'->>'value')::numeric ELSE NULL END,
          -- LOINC 59408-5 = SpO2
          CASE WHEN v_payload->'code'->'coding'->0->>'code' = '59408-5'
            THEN (v_payload->'valueQuantity'->>'value')::numeric ELSE NULL END
        );
      END IF;

    WHEN 'MedicationRequest' THEN
      INSERT INTO public.medications (
        patient_id, name, dosage, frequency, prescribed_by,
        start_date, status, facility_id, facility_name
      ) VALUES (
        v_patient_id,
        COALESCE(
          NULLIF(v_payload->'medicationCodeableConcept'->>'text', ''),
          NEW.summary
        ),
        COALESCE(v_payload->'dosageInstruction'->0->>'text', ''),
        COALESCE(v_payload->'dosageInstruction'->0->'timing'->'repeat'->>'period', ''),
        COALESCE(NULLIF(NEW.practitioner, ''), 'Unknown'),
        v_record_date,
        'active',
        NEW.source_facility_id,
        NEW.source_facility_name
      );

    ELSE
      -- Catch-all: write as a generic encounter so the record is never lost
      INSERT INTO public.encounters (
        patient_id, encounter_date, type, diagnosis,
        practitioner, facility_id, facility_name, status, notes
      ) VALUES (
        v_patient_id,
        v_record_date,
        'record',
        COALESCE(NULLIF(NEW.data_type, ''), 'Unknown'),
        COALESCE(NULLIF(NEW.practitioner, ''), 'Unknown'),
        NEW.source_facility_id,
        NEW.source_facility_name,
        'completed',
        NEW.summary
      );
  END CASE;

  -- ── 3. Increment facility records_count ───────────────────
  UPDATE public.facilities
  SET records_count = records_count + 1,
      updated_at    = now()
  WHERE id = NEW.source_facility_id;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Never block the approval — log and continue
  RAISE WARNING 'integrate_approved_staged_record failed for record %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Grant execute to authenticated so RLS policies can call it indirectly
GRANT EXECUTE ON FUNCTION public.integrate_approved_staged_record() TO authenticated;

CREATE TRIGGER trg_integrate_approved_staged_record
  AFTER UPDATE OF status ON public.staged_records
  FOR EACH ROW
  EXECUTE FUNCTION public.integrate_approved_staged_record();

-- ── Back-fill: integrate records already approved before this trigger existed ──
-- We can't toggle status (check constraint). Instead, call the integration logic
-- directly for all existing approved records via a DO block.
DO $$
DECLARE
  r              public.staged_records%ROWTYPE;
  v_patient_id   uuid;
  v_payload      jsonb;
  v_record_date  date;
  v_first_name   text;
  v_last_name    text;
  v_gender       text;
  v_dob          date;
BEGIN
  FOR r IN SELECT * FROM public.staged_records WHERE status = 'approved' LOOP
    BEGIN
      v_payload     := COALESCE(r.fhir_payload, '{}'::jsonb);
      v_first_name  := COALESCE(v_payload->'name'->0->'given'->>0, split_part(r.patient_name, ' ', 1), 'Unknown');
      v_last_name   := COALESCE(v_payload->'name'->0->>'family',
                         CASE WHEN array_length(string_to_array(trim(r.patient_name), ' '), 1) > 1
                           THEN split_part(trim(r.patient_name), ' ', 2) ELSE 'Unknown' END);
      v_gender      := COALESCE(initcap(v_payload->>'gender'), 'Unknown');
      v_dob         := COALESCE((NULLIF(v_payload->>'birthDate',''))::date, '1900-01-01'::date);
      v_record_date := COALESCE(
        (NULLIF(v_payload->'period'->>'start',''))::date,
        (NULLIF(v_payload->>'effectiveDateTime',''))::date,
        (NULLIF(v_payload->>'authoredOn',''))::date,
        (r.submitted_at)::date, CURRENT_DATE);

      SELECT id INTO v_patient_id FROM public.patients WHERE nin = r.nin LIMIT 1;
      IF v_patient_id IS NULL AND r.nin IS NOT NULL AND r.nin <> '' THEN
        INSERT INTO public.patients (nin, first_name, last_name, date_of_birth, gender, facility_id)
        VALUES (r.nin, v_first_name, v_last_name, v_dob, v_gender, r.source_facility_id)
        ON CONFLICT (nin) DO UPDATE SET updated_at = now()
        RETURNING id INTO v_patient_id;
      END IF;

      IF v_patient_id IS NOT NULL THEN
        CASE COALESCE(r.fhir_resource_type, 'Encounter')
          WHEN 'Encounter' THEN
            INSERT INTO public.encounters (patient_id, encounter_date, type, diagnosis, practitioner, facility_id, facility_name, status, notes)
            VALUES (v_patient_id, v_record_date,
              COALESCE(NULLIF(v_payload->'class'->>'code',''), 'outpatient'),
              COALESCE(NULLIF(v_payload->'reasonCode'->0->>'text',''), r.summary),
              COALESCE(NULLIF(r.practitioner,''), 'Unknown'),
              r.source_facility_id, r.source_facility_name, 'completed', r.summary);
          WHEN 'Observation' THEN
            IF r.data_type ILIKE '%lab%' OR r.data_type ILIKE '%result%' THEN
              INSERT INTO public.lab_results (patient_id, test, result, unit, reference_range, result_date, status, facility_id, facility_name)
              VALUES (v_patient_id,
                COALESCE(NULLIF(v_payload->'code'->>'text',''), r.data_type),
                COALESCE(v_payload->'valueQuantity'->>'value', r.summary), '',  '', v_record_date, 'final',
                r.source_facility_id, r.source_facility_name);
            ELSE
              INSERT INTO public.vital_records (patient_id, recorded_date, facility_id, facility_name)
              VALUES (v_patient_id, v_record_date, r.source_facility_id, r.source_facility_name);
            END IF;
          WHEN 'MedicationRequest' THEN
            INSERT INTO public.medications (patient_id, name, dosage, frequency, prescribed_by, start_date, status, facility_id, facility_name)
            VALUES (v_patient_id,
              COALESCE(NULLIF(v_payload->'medicationCodeableConcept'->>'text',''), r.summary),
              COALESCE(v_payload->'dosageInstruction'->0->>'text', ''), '',
              COALESCE(NULLIF(r.practitioner,''), 'Unknown'),
              v_record_date, 'active', r.source_facility_id, r.source_facility_name);
          ELSE
            INSERT INTO public.encounters (patient_id, encounter_date, type, diagnosis, practitioner, facility_id, facility_name, status, notes)
            VALUES (v_patient_id, v_record_date, 'record', COALESCE(NULLIF(r.data_type,''), 'Unknown'),
              COALESCE(NULLIF(r.practitioner,''), 'Unknown'),
              r.source_facility_id, r.source_facility_name, 'completed', r.summary);
        END CASE;

        UPDATE public.facilities SET records_count = records_count + 1, updated_at = now()
        WHERE id = r.source_facility_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'back-fill skipped record %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260518000000')
  ON CONFLICT DO NOTHING;
