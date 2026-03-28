
-- Facility status enum
CREATE TYPE public.facility_status AS ENUM ('online', 'degraded', 'offline');

-- Facilities table
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  state text NOT NULL,
  ehr_system text NOT NULL DEFAULT 'OpenMRS',
  status facility_status NOT NULL DEFAULT 'online',
  uptime numeric(5,2) NOT NULL DEFAULT 99.00,
  records_count integer NOT NULL DEFAULT 0,
  last_sync timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Patients table
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nin text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female')),
  phone text,
  blood_group text CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  genotype text CHECK (genotype IN ('AA', 'AS', 'SS', 'AC', 'SC')),
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  lga text,
  state text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_patients_nin ON public.patients(nin);
CREATE INDEX idx_patients_facility ON public.patients(facility_id);
CREATE INDEX idx_patients_name ON public.patients(last_name, first_name);

-- RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Facilities: all authenticated users can read
CREATE POLICY "Authenticated users can view facilities"
  ON public.facilities FOR SELECT TO authenticated
  USING (true);

-- Facilities: only admins can manage
CREATE POLICY "Admins can manage facilities"
  ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Patients: all authenticated users can read
CREATE POLICY "Authenticated users can view patients"
  ON public.patients FOR SELECT TO authenticated
  USING (true);

-- Patients: only admins can manage
CREATE POLICY "Admins can manage patients"
  ON public.patients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));
