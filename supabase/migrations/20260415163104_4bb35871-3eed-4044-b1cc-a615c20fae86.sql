
-- Create facility_connections table for EHR integration config
CREATE TABLE public.facility_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  ehr_type text NOT NULL DEFAULT 'OpenMRS',
  base_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'basic' CHECK (auth_type IN ('basic', 'oauth2', 'api_key')),
  auth_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  fhir_version text NOT NULL DEFAULT 'R4',
  sync_direction text NOT NULL DEFAULT 'pull' CHECK (sync_direction IN ('pull', 'push', 'bidirectional')),
  sync_interval_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  last_successful_sync timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (facility_id, ehr_type)
);

-- Enable RLS
ALTER TABLE public.facility_connections ENABLE ROW LEVEL SECURITY;

-- Admins can manage connections
CREATE POLICY "Admins can manage facility connections"
ON public.facility_connections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Authenticated users can view connections
CREATE POLICY "Authenticated users can view connections"
ON public.facility_connections
FOR SELECT
TO authenticated
USING (true);

-- Create sync_logs table for tracking sync attempts
CREATE TABLE public.sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_connection_id uuid REFERENCES public.facility_connections(id) ON DELETE SET NULL,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'retrying')),
  records_processed integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  error_message text,
  error_details jsonb,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamp with time zone,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage sync logs
CREATE POLICY "Admins can manage sync logs"
ON public.sync_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Authenticated users can view sync logs
CREATE POLICY "Authenticated users can view sync logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (true);

-- Create indexes for performance
CREATE INDEX idx_facility_connections_facility ON public.facility_connections(facility_id);
CREATE INDEX idx_facility_connections_active ON public.facility_connections(is_active) WHERE is_active = true;
CREATE INDEX idx_sync_logs_facility ON public.sync_logs(facility_id);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_retry ON public.sync_logs(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
