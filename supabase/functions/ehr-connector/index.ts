import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== CLOUD-AGNOSTIC: FHIR Resource Mapper =====
// This entire section is pure TypeScript — portable to AWS Lambda, Azure Functions, etc.

interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  identifier?: Array<{ system: string; value: string }>;
  name?: Array<{ family: string; given: string[] }>;
  gender?: string;
  birthDate?: string;
}

interface FHIREncounter {
  resourceType: "Encounter";
  id?: string;
  status?: string;
  class?: { code: string };
  subject?: { reference: string };
  period?: { start: string; end?: string };
  reasonCode?: Array<{ text: string }>;
}

interface FHIRObservation {
  resourceType: "Observation";
  id?: string;
  status?: string;
  code?: { text: string; coding?: Array<{ system: string; code: string; display: string }> };
  valueQuantity?: { value: number; unit: string };
  effectiveDateTime?: string;
}

interface NormalizedRecord {
  patient_name: string;
  nin: string;
  data_type: string;
  summary: string;
  practitioner: string;
  fhir_resource_type: string;
  fhir_payload: unknown;
  priority: string;
  status: string;
  conflict_type: string | null;
}

function extractNIN(patient: FHIRPatient): string {
  const ninId = patient.identifier?.find(
    (id) => id.system === "urn:ng:nin" || id.system?.includes("national-id")
  );
  return ninId?.value || "";
}

function extractPatientName(patient: FHIRPatient): string {
  if (!patient.name?.[0]) return "Unknown Patient";
  const name = patient.name[0];
  return `${name.given?.join(" ") || ""} ${name.family || ""}`.trim();
}

function mapFHIRBundle(bundle: any): NormalizedRecord[] {
  const records: NormalizedRecord[] = [];
  const entries = bundle.entry || [];

  let patient: FHIRPatient | null = null;
  const encounters: FHIREncounter[] = [];
  const observations: FHIRObservation[] = [];
  const others: any[] = [];

  for (const entry of entries) {
    const resource = entry.resource;
    if (!resource) continue;
    switch (resource.resourceType) {
      case "Patient": patient = resource; break;
      case "Encounter": encounters.push(resource); break;
      case "Observation": observations.push(resource); break;
      default: others.push(resource); break;
    }
  }

  const patientName = patient ? extractPatientName(patient) : "Unknown Patient";
  const nin = patient ? extractNIN(patient) : "";

  for (const enc of encounters) {
    records.push({
      patient_name: patientName,
      nin,
      data_type: "Encounter + Diagnosis",
      summary: `Encounter: ${enc.reasonCode?.[0]?.text || enc.class?.code || "General visit"}. Status: ${enc.status || "unknown"}.`,
      practitioner: "",
      fhir_resource_type: "Encounter",
      fhir_payload: enc,
      priority: "medium",
      status: "pending",
      conflict_type: null,
    });
  }

  for (const obs of observations) {
    const display = obs.code?.text || obs.code?.coding?.[0]?.display || "Observation";
    const value = obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}` : "N/A";
    records.push({
      patient_name: patientName,
      nin,
      data_type: obs.code?.coding?.[0]?.code?.startsWith("LP") ? "Lab Results" : "Vitals + Labs",
      summary: `${display}: ${value}`,
      practitioner: "",
      fhir_resource_type: "Observation",
      fhir_payload: obs,
      priority: "medium",
      status: "pending",
      conflict_type: null,
    });
  }

  for (const res of others) {
    records.push({
      patient_name: patientName,
      nin,
      data_type: res.resourceType || "Unknown",
      summary: `${res.resourceType} resource received`,
      practitioner: "",
      fhir_resource_type: res.resourceType,
      fhir_payload: res,
      priority: "low",
      status: "pending",
      conflict_type: null,
    });
  }

  return records;
}

// ===== CLOUD-AGNOSTIC: EHR API Client =====
// Pure fetch-based — works on Deno, Node.js, Cloudflare Workers, etc.

interface EHRConnectionConfig {
  base_url: string;
  auth_type: "basic" | "oauth2" | "api_key";
  auth_credentials: {
    username?: string;
    password?: string;
    client_id?: string;
    client_secret?: string;
    token_url?: string;
    api_key?: string;
    api_key_header?: string;
  };
  fhir_version: string;
}

async function getAuthHeaders(config: EHRConnectionConfig): Promise<Record<string, string>> {
  const creds = config.auth_credentials;

  switch (config.auth_type) {
    case "basic": {
      const encoded = btoa(`${creds.username}:${creds.password}`);
      return { Authorization: `Basic ${encoded}` };
    }
    case "oauth2": {
      const tokenRes = await fetch(creds.token_url!, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: creds.client_id!,
          client_secret: creds.client_secret!,
        }),
      });
      const tokenData = await tokenRes.json();
      return { Authorization: `Bearer ${tokenData.access_token}` };
    }
    case "api_key": {
      return { [creds.api_key_header || "X-API-Key"]: creds.api_key! };
    }
    default:
      return {};
  }
}

async function pullFromEHR(config: EHRConnectionConfig, endpoint: string): Promise<any> {
  const authHeaders = await getAuthHeaders(config);
  const url = `${config.base_url.replace(/\/$/, "")}/${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/fhir+json",
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(`EHR API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function pushToEHR(config: EHRConnectionConfig, resourceType: string, payload: any): Promise<any> {
  const authHeaders = await getAuthHeaders(config);
  const url = `${config.base_url.replace(/\/$/, "")}/${resourceType}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`EHR push error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ===== INFRASTRUCTURE GLUE: Supabase-specific handler =====
// This is the only part that changes when migrating to AWS Lambda

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const { data: roleData } = await supabase.rpc("has_role", { _user_id: userId, _role: "administrator" });
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      // ---- PULL: Fetch records from a remote EHR ----
      case "pull": {
        const { connection_id } = params;
        if (!connection_id) {
          return new Response(JSON.stringify({ error: "connection_id required" }), { status: 400, headers: corsHeaders });
        }

        // Get connection config
        const { data: conn, error: connErr } = await supabase
          .from("facility_connections")
          .select("*")
          .eq("id", connection_id)
          .eq("is_active", true)
          .single();

        if (connErr || !conn) {
          return new Response(JSON.stringify({ error: "Connection not found or inactive" }), { status: 404, headers: corsHeaders });
        }

        // Create sync log
        const { data: syncLog } = await supabase.from("sync_logs").insert({
          facility_connection_id: conn.id,
          facility_id: conn.facility_id,
          direction: "inbound",
          status: "in_progress",
        }).select("id").single();

        try {
          // Pull patient data from EHR
          const bundle = await pullFromEHR(conn as EHRConnectionConfig, "Patient?_revinclude=*&_count=50");
          const records = mapFHIRBundle(bundle);

          // Get facility name
          const { data: facility } = await supabase.from("facilities").select("name").eq("id", conn.facility_id).single();

          // Insert into staging queue
          const stagedRecords = records.map((r) => ({
            ...r,
            source_facility_id: conn.facility_id,
            source_facility_name: facility?.name || "Unknown Facility",
            submitted_at: new Date().toISOString(),
          }));

          if (stagedRecords.length > 0) {
            const { error: insertErr } = await supabase.from("staged_records").insert(stagedRecords);
            if (insertErr) throw new Error(insertErr.message);
          }

          // Update sync log as completed
          await supabase.from("sync_logs").update({
            status: "completed",
            records_processed: records.length,
            completed_at: new Date().toISOString(),
          }).eq("id", syncLog?.id);

          // Update connection last sync
          await supabase.from("facility_connections").update({
            last_successful_sync: new Date().toISOString(),
          }).eq("id", conn.id);

          // Update facility last_sync
          await supabase.from("facilities").update({
            last_sync: new Date().toISOString(),
          }).eq("id", conn.facility_id);

          return new Response(JSON.stringify({
            success: true,
            records_synced: records.length,
            sync_log_id: syncLog?.id,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (pullErr: any) {
          // Log failure for retry
          await supabase.from("sync_logs").update({
            status: "failed",
            error_message: pullErr.message,
            error_details: { stack: pullErr.stack },
            next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }).eq("id", syncLog?.id);

          return new Response(JSON.stringify({ error: pullErr.message, sync_log_id: syncLog?.id }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ---- PUSH: Send an approved record back to the source EHR ----
      case "push": {
        const { record_id } = params;
        if (!record_id) {
          return new Response(JSON.stringify({ error: "record_id required" }), { status: 400, headers: corsHeaders });
        }

        const { data: record, error: recErr } = await supabase
          .from("staged_records")
          .select("*, source_facility_id")
          .eq("id", record_id)
          .single();

        if (recErr || !record) {
          return new Response(JSON.stringify({ error: "Record not found" }), { status: 404, headers: corsHeaders });
        }

        // Find connection for source facility
        const { data: conn } = await supabase
          .from("facility_connections")
          .select("*")
          .eq("facility_id", record.source_facility_id)
          .eq("is_active", true)
          .single();

        if (!conn) {
          return new Response(JSON.stringify({ error: "No active connection for source facility" }), { status: 404, headers: corsHeaders });
        }

        // Create outbound sync log
        const { data: syncLog } = await supabase.from("sync_logs").insert({
          facility_connection_id: conn.id,
          facility_id: conn.facility_id,
          direction: "outbound",
          status: "in_progress",
        }).select("id").single();

        try {
          await pushToEHR(conn as EHRConnectionConfig, record.fhir_resource_type || "Bundle", record.fhir_payload);

          await supabase.from("sync_logs").update({
            status: "completed",
            records_processed: 1,
            completed_at: new Date().toISOString(),
          }).eq("id", syncLog?.id);

          return new Response(JSON.stringify({ success: true, sync_log_id: syncLog?.id }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });

        } catch (pushErr: any) {
          await supabase.from("sync_logs").update({
            status: "failed",
            error_message: pushErr.message,
            records_failed: 1,
            next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }).eq("id", syncLog?.id);

          return new Response(JSON.stringify({ error: pushErr.message }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ---- WEBHOOK: Receive inbound push from an EHR ----
      case "webhook": {
        const { facility_id, bundle } = params;
        if (!facility_id || !bundle) {
          return new Response(JSON.stringify({ error: "facility_id and bundle required" }), { status: 400, headers: corsHeaders });
        }

        const records = mapFHIRBundle(bundle);
        const { data: facility } = await supabase.from("facilities").select("name").eq("id", facility_id).single();

        const stagedRecords = records.map((r) => ({
          ...r,
          source_facility_id: facility_id,
          source_facility_name: facility?.name || "Unknown Facility",
          submitted_at: new Date().toISOString(),
        }));

        if (stagedRecords.length > 0) {
          const { error: insertErr } = await supabase.from("staged_records").insert(stagedRecords);
          if (insertErr) {
            return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: corsHeaders });
          }
        }

        // Log the webhook sync
        const { data: conn } = await supabase
          .from("facility_connections")
          .select("id")
          .eq("facility_id", facility_id)
          .eq("is_active", true)
          .maybeSingle();

        await supabase.from("sync_logs").insert({
          facility_connection_id: conn?.id || null,
          facility_id,
          direction: "inbound",
          status: "completed",
          records_processed: records.length,
          completed_at: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ success: true, records_received: records.length }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- RETRY: Retry failed sync attempts ----
      case "retry": {
        const { data: failedLogs } = await supabase
          .from("sync_logs")
          .select("*, facility_connections(*)")
          .eq("status", "failed")
          .lt("retry_count", 3)
          .lte("next_retry_at", new Date().toISOString())
          .limit(10);

        if (!failedLogs || failedLogs.length === 0) {
          return new Response(JSON.stringify({ message: "No failed syncs to retry", retried: 0 }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let retried = 0;
        for (const log of failedLogs) {
          const conn = log.facility_connections;
          if (!conn || !conn.is_active) continue;

          await supabase.from("sync_logs").update({
            status: "retrying",
            retry_count: log.retry_count + 1,
          }).eq("id", log.id);

          try {
            if (log.direction === "inbound") {
              const bundle = await pullFromEHR(conn as EHRConnectionConfig, "Patient?_revinclude=*&_count=50");
              const records = mapFHIRBundle(bundle);
              const { data: facility } = await supabase.from("facilities").select("name").eq("id", conn.facility_id).single();

              const stagedRecords = records.map((r) => ({
                ...r,
                source_facility_id: conn.facility_id,
                source_facility_name: facility?.name || "Unknown Facility",
                submitted_at: new Date().toISOString(),
              }));

              if (stagedRecords.length > 0) {
                await supabase.from("staged_records").insert(stagedRecords);
              }

              await supabase.from("sync_logs").update({
                status: "completed",
                records_processed: records.length,
                completed_at: new Date().toISOString(),
              }).eq("id", log.id);
            }
            retried++;
          } catch (retryErr: any) {
            const nextRetry = new Date(Date.now() + (log.retry_count + 1) * 10 * 60 * 1000); // exponential backoff
            await supabase.from("sync_logs").update({
              status: "failed",
              error_message: retryErr.message,
              next_retry_at: nextRetry.toISOString(),
            }).eq("id", log.id);
          }
        }

        return new Response(JSON.stringify({ success: true, retried }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
