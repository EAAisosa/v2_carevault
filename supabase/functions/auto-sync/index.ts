import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ── Shared FHIR helpers (inlined to avoid inter-function HTTP calls) ──────────

interface FHIRPatient {
  resourceType: "Patient";
  identifier?: Array<{ system: string; value: string }>;
  name?: Array<{ family: string; given: string[] }>;
  gender?: string;
  birthDate?: string;
}

function extractNIN(patient: FHIRPatient): string {
  const ninId = patient.identifier?.find(
    (id) => id.system === "urn:ng:nin" || id.system?.includes("national-id")
  );
  return ninId?.value || "";
}

function extractPatientName(patient: FHIRPatient): string {
  if (!patient.name?.[0]) return "Unknown Patient";
  const { given, family } = patient.name[0];
  return `${given?.join(" ") || ""} ${family || ""}`.trim();
}

function mapFHIRBundle(bundle: any) {
  const entries = bundle.entry || [];
  let patient: FHIRPatient | null = null;
  const encounters: any[] = [];
  const observations: any[] = [];
  const others: any[] = [];

  for (const entry of entries) {
    const r = entry.resource;
    if (!r) continue;
    switch (r.resourceType) {
      case "Patient":     patient = r; break;
      case "Encounter":   encounters.push(r); break;
      case "Observation": observations.push(r); break;
      default:            others.push(r); break;
    }
  }

  const patientName = patient ? extractPatientName(patient) : "Unknown Patient";
  const nin = patient ? extractNIN(patient) : "";

  return [
    ...encounters.map((enc) => ({
      patient_name: patientName, nin,
      data_type: "Encounter + Diagnosis",
      summary: `Encounter: ${enc.reasonCode?.[0]?.text || enc.class?.code || "General visit"}. Status: ${enc.status || "unknown"}.`,
      practitioner: "", fhir_resource_type: "Encounter", fhir_payload: enc,
      priority: "medium", status: "pending", conflict_type: null,
    })),
    ...observations.map((obs) => {
      const display = obs.code?.text || obs.code?.coding?.[0]?.display || "Observation";
      const val = obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}` : "N/A";
      return {
        patient_name: patientName, nin,
        data_type: obs.code?.coding?.[0]?.code?.startsWith("LP") ? "Lab Results" : "Vitals + Labs",
        summary: `${display}: ${val}`,
        practitioner: "", fhir_resource_type: "Observation", fhir_payload: obs,
        priority: "medium", status: "pending", conflict_type: null,
      };
    }),
    ...others.map((res) => ({
      patient_name: patientName, nin,
      data_type: res.resourceType || "Unknown",
      summary: `${res.resourceType} resource received`,
      practitioner: "", fhir_resource_type: res.resourceType, fhir_payload: res,
      priority: "low", status: "pending", conflict_type: null,
    })),
  ];
}

interface EHRConfig {
  base_url: string;
  auth_type: "basic" | "oauth2" | "api_key";
  auth_credentials: {
    username?: string; password?: string;
    client_id?: string; client_secret?: string; token_url?: string;
    api_key?: string; header?: string; api_key_header?: string;
  };
}

async function getAuthHeaders(config: EHRConfig): Promise<Record<string, string>> {
  const c = config.auth_credentials;
  switch (config.auth_type) {
    case "basic": {
      return { Authorization: `Basic ${btoa(`${c.username}:${c.password}`)}` };
    }
    case "oauth2": {
      const res = await fetch(c.token_url!, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: c.client_id!,
          client_secret: c.client_secret!,
        }),
      });
      const { access_token } = await res.json();
      return { Authorization: `Bearer ${access_token}` };
    }
    case "api_key": {
      const headerName = c.header || c.api_key_header || "X-API-Key";
      return { [headerName]: c.api_key! };
    }
    default:
      return {};
  }
}

async function pullFromEHR(config: EHRConfig, endpoint: string): Promise<any> {
  const headers = await getAuthHeaders(config);
  const url = `${config.base_url.replace(/\/$/, "")}/${endpoint}`;
  const res = await fetch(url, { headers: { Accept: "application/fhir+json", ...headers } });
  if (!res.ok) throw new Error(`EHR API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Validate cron secret — only pg_cron/internal callers should reach this
  const cronSecret = Deno.env.get("CRON_SECRET");
  const incoming  = req.headers.get("X-Cron-Secret");

  if (!cronSecret || incoming !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find connections due for sync:
  // is_active AND (never synced OR last sync + interval <= now)
  const { data: dueConns, error: connErr } = await supabase
    .from("facility_connections")
    .select("id, facility_id, ehr_type, base_url, auth_type, auth_credentials, auth_credentials_encrypted, sync_interval_minutes, last_successful_sync")
    .eq("is_active", true)
    .or(`last_successful_sync.is.null,last_successful_sync.lte.${new Date(Date.now() - 0).toISOString()}`);

  if (connErr) {
    return new Response(JSON.stringify({ error: connErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const due = (dueConns || []).filter((conn) => {
    if (!conn.last_successful_sync) return true;
    const nextSync = new Date(conn.last_successful_sync).getTime() + conn.sync_interval_minutes * 60_000;
    return now >= nextSync;
  });

  const results: { connection_id: string; status: string; records?: number; error?: string }[] = [];

  for (const conn of due) {
    // Get decrypted credentials via SECURITY DEFINER function
    const { data: creds } = await supabase.rpc("get_decrypted_ehr_credentials", {
      p_connection_id: conn.id,
    });

    const config: EHRConfig = {
      base_url: conn.base_url,
      auth_type: conn.auth_type,
      auth_credentials: creds || conn.auth_credentials || {},
    };

    // Create inbound sync log
    const { data: syncLog } = await supabase
      .from("sync_logs")
      .insert({ facility_connection_id: conn.id, facility_id: conn.facility_id, direction: "inbound", status: "in_progress" })
      .select("id")
      .single();

    try {
      const bundle  = await pullFromEHR(config, "Patient?_revinclude=*&_count=50");
      const records = mapFHIRBundle(bundle);

      const { data: facility } = await supabase
        .from("facilities").select("name").eq("id", conn.facility_id).single();

      if (records.length > 0) {
        const staged = records.map((r) => ({
          ...r,
          source_facility_id:   conn.facility_id,
          source_facility_name: facility?.name || "Unknown Facility",
          submitted_at:         new Date().toISOString(),
        }));
        const { error: insertErr } = await supabase.from("staged_records").insert(staged);
        if (insertErr) throw new Error(insertErr.message);
      }

      await supabase.from("sync_logs").update({
        status: "completed", records_processed: records.length,
        completed_at: new Date().toISOString(),
      }).eq("id", syncLog?.id);

      await supabase.from("facility_connections").update({
        last_successful_sync: new Date().toISOString(),
      }).eq("id", conn.id);

      await supabase.from("facilities").update({
        last_sync: new Date().toISOString(),
      }).eq("id", conn.facility_id);

      results.push({ connection_id: conn.id, status: "synced", records: records.length });

    } catch (err: any) {
      await supabase.from("sync_logs").update({
        status: "failed", error_message: err.message,
        next_retry_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      }).eq("id", syncLog?.id);

      results.push({ connection_id: conn.id, status: "failed", error: err.message });
    }
  }

  return new Response(
    JSON.stringify({ ran_at: new Date().toISOString(), due: due.length, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
