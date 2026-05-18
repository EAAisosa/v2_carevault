-- ============================================================
-- EHR Credential Encryption
-- auth_credentials (jsonb) → encrypted text column via pgcrypto
-- Key is set at DB level: ALTER DATABASE ... SET app.settings.credentials_key = '...'
-- In dev mode (no key set) credentials remain in plaintext column unchanged.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted column alongside the existing plaintext column
ALTER TABLE public.facility_connections
  ADD COLUMN IF NOT EXISTS auth_credentials_encrypted text;

-- ── Encryption trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.encrypt_ehr_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := current_setting('app.settings.credentials_key', true);
BEGIN
  -- No key configured (dev/test mode) — leave plaintext column as-is
  IF v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_credentials IS NOT NULL THEN
    NEW.auth_credentials_encrypted :=
      encode(pgp_sym_encrypt(NEW.auth_credentials::text, v_key), 'base64');
    -- Clear plaintext after encrypting
    NEW.auth_credentials := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_ehr_credentials ON public.facility_connections;
CREATE TRIGGER trg_encrypt_ehr_credentials
  BEFORE INSERT OR UPDATE OF auth_credentials
  ON public.facility_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_ehr_credentials();

-- ── Decryption helper (service_role only) ──────────────────
CREATE OR REPLACE FUNCTION public.get_decrypted_ehr_credentials(p_connection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key       text := current_setting('app.settings.credentials_key', true);
  v_encrypted text;
  v_plaintext jsonb;
BEGIN
  SELECT auth_credentials_encrypted, auth_credentials
    INTO v_encrypted, v_plaintext
  FROM public.facility_connections
  WHERE id = p_connection_id;

  -- Plaintext still present (dev mode or pre-encryption row)
  IF v_encrypted IS NULL THEN
    RETURN v_plaintext;
  END IF;

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'app.settings.credentials_key is not configured';
  END IF;

  RETURN pgp_sym_decrypt(decode(v_encrypted, 'base64'), v_key)::jsonb;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'get_decrypted_ehr_credentials failed for %: %', p_connection_id, SQLERRM;
  RETURN NULL;
END;
$$;

-- Strip access from all roles except service_role (runs as postgres/SECURITY DEFINER owner)
REVOKE ALL ON FUNCTION public.get_decrypted_ehr_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_decrypted_ehr_credentials(uuid) TO service_role;

-- ── Back-fill: encrypt any existing plaintext rows ──────────
-- Doing an in-place UPDATE fires the trigger, which encrypts and clears plaintext.
UPDATE public.facility_connections
SET auth_credentials = auth_credentials
WHERE auth_credentials IS NOT NULL;

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260518000001')
  ON CONFLICT DO NOTHING;
