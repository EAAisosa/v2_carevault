import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NIGERIAN_NAMES = {
  first: ["Adebayo", "Amina", "Chukwuemeka", "Fatima", "Oluwaseun", "Ngozi", "Ibrahim", "Yetunde", "Emeka", "Halima", "Tunde", "Blessing", "Musa", "Aisha", "Obinna"],
  last: ["Ogundimu", "Ibrahim", "Okafor", "Abdullahi", "Adeyemi", "Eze", "Bello", "Okonkwo", "Garba", "Nwosu", "Bakare", "Mohammed", "Okoro", "Lawal", "Chidi"],
};

const PRACTITIONERS = [
  "Dr. Folake Adeleke", "Dr. Emeka Nwankwo", "Dr. Aisha Mohammed", "Dr. Ibrahim Musa",
  "Dr. Obi Eze", "Dr. Musa Garba", "Dr. Funke Balogun", "Dr. Nkechi Okoro",
];

const DATA_TYPES = ["Encounter + Vitals", "Lab Results", "Medications", "Encounter + Diagnosis", "Vitals + Labs", "Allergy Update", "Immunization Record"];

const SUMMARIES = [
  "Routine BP check — systolic {s}, diastolic {d}. Patient stable on current medications.",
  "CBC and LFT results within normal range. Hemoglobin at {h} g/dL.",
  "Prescription refill for Metformin 500mg BD. Blood glucose trending down.",
  "Emergency presentation with acute malaria. RDT positive. Artesunate IV administered.",
  "Antenatal visit — 28 weeks gestation. Fetal heart rate normal. No complications.",
  "Follow-up for Type 2 DM. HbA1c at {a}%. Medication adjusted.",
  "New allergy documented: {allergy}. Patient counselled on avoidance.",
  "Post-surgical follow-up. Wound healing well. Sutures removed.",
  "Childhood immunization — Pentavalent vaccine dose 3 administered.",
  "Hypertension follow-up. BP {s}/{d} mmHg. Dose titration recommended.",
];

const CONFLICT_TYPES = [
  null, null, null, // weighted toward no conflict
  "Conflicting allergy data with existing record",
  "Duplicate encounter suspected — similar record from yesterday",
  "Blood group mismatch with registered data",
  "Medication interaction alert with current prescriptions",
];

const ALLERGIES = ["Penicillin", "Sulfonamides", "NSAIDs", "Latex", "Codeine", "Chloroquine"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNIN(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

function generateSummary(): string {
  let summary = pick(SUMMARIES);
  summary = summary.replace("{s}", String(120 + Math.floor(Math.random() * 40)));
  summary = summary.replace("{d}", String(70 + Math.floor(Math.random() * 25)));
  summary = summary.replace("{h}", (10 + Math.random() * 5).toFixed(1));
  summary = summary.replace("{a}", (6 + Math.random() * 3).toFixed(1));
  summary = summary.replace("{allergy}", pick(ALLERGIES));
  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { facility_id } = await req.json();
    if (!facility_id) {
      return new Response(JSON.stringify({ error: "facility_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get facility info
    const { data: facility, error: facErr } = await supabase
      .from("facilities")
      .select("id, name")
      .eq("id", facility_id)
      .single();

    if (facErr || !facility) {
      return new Response(JSON.stringify({ error: "Facility not found" }), { status: 404, headers: corsHeaders });
    }

    // Generate 2-5 mock records
    const count = 2 + Math.floor(Math.random() * 4);
    const records = Array.from({ length: count }, () => {
      const firstName = pick(NIGERIAN_NAMES.first);
      const lastName = pick(NIGERIAN_NAMES.last);
      const dataType = pick(DATA_TYPES);
      const priority = pick(["low", "medium", "medium", "high", "critical"] as const);
      const conflict = pick(CONFLICT_TYPES);

      return {
        patient_name: `${firstName} ${lastName}`,
        nin: generateNIN(),
        source_facility_id: facility.id,
        source_facility_name: facility.name,
        data_type: dataType,
        submitted_at: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)).toISOString(),
        status: conflict ? "needs-review" : "pending",
        priority,
        summary: generateSummary(),
        practitioner: pick(PRACTITIONERS),
        conflict_type: conflict,
        fhir_resource_type: dataType.includes("Encounter") ? "Encounter" : dataType.includes("Lab") ? "Observation" : "MedicationRequest",
        fhir_payload: {
          resourceType: "Bundle",
          type: "collection",
          meta: { source: facility.name, syncedAt: new Date().toISOString() },
        },
      };
    });

    const { error: insertErr } = await supabase.from("staged_records").insert(records);
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: corsHeaders });
    }

    // Update facility last_sync
    await supabase.from("facilities").update({ last_sync: new Date().toISOString() }).eq("id", facility_id);

    return new Response(JSON.stringify({ success: true, records_synced: count }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
