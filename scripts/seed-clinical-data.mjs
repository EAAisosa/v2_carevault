import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://xvozzsoufirdxlnnlnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2b3p6c291ZmlyZHhsbm5sbmt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDcwNjU4NCwiZXhwIjoyMDkwMjgyNTg0fQ.JGwmbgOhvcZJZ-wGMUTth2pAOaVB-NX-sUB6SOTt9sI"
);

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));

// Past date helpers
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function pastDate(minDays, maxDays) {
  return daysAgo(randInt(minDays, maxDays));
}

// ── Reference data ────────────────────────────────────────────────────────────
const FACILITIES = []; // filled from DB
const PRACTITIONERS = [
  "Dr. Folake Adeleke", "Dr. Emeka Nwankwo", "Dr. Ibrahim Musa",
  "Dr. Aisha Mohammed", "Dr. Obi Eze", "Dr. Funke Balogun",
  "Dr. Chidi Okonkwo", "Dr. Ngozi Osei", "Dr. Musa Garba",
  "Dr. Tunde Fashola", "Dr. Amaka Uche", "Dr. Yakubu Danladi",
];
const ENCOUNTER_TYPES = ["Outpatient", "Inpatient", "Emergency", "Routine Follow-up", "Specialist Referral"];
const DIAGNOSES = [
  ["Hypertension Stage 2", "BP elevated. Started on Amlodipine 5mg. Follow up in 2 weeks."],
  ["Type 2 Diabetes Mellitus", "HbA1c at 7.8%. Metformin 500mg BD initiated. Dietary counselling provided."],
  ["Malaria (P. falciparum)", "Admitted. IV Artesunate followed by ACTs. Discharged stable."],
  ["Acute Gastroenteritis", "IV fluids administered. Oral rehydration salts prescribed. Resolved."],
  ["Typhoid Fever", "Widal test positive. Ciprofloxacin 500mg BD for 7 days. Review in 1 week."],
  ["Pneumonia (Community-acquired)", "Chest X-ray confirmed. Amoxicillin-Clavulanate started. Oxygen therapy."],
  ["Peptic Ulcer Disease", "Endoscopy confirmed duodenal ulcer. PPI and H.pylori eradication therapy."],
  ["Asthma (Moderate Persistent)", "Peak flow 65% predicted. Salbutamol nebulisation. Inhaled corticosteroids adjusted."],
  ["Sickle Cell Crisis", "Vaso-occlusive episode. IV fluids, analgesia and oxygen administered."],
  ["Urinary Tract Infection", "Urine culture positive for E.coli. Nitrofurantoin prescribed for 5 days."],
  ["Anaemia (Severe)", "Hb 6.2 g/dL. Two units packed red cells transfused. Iron supplementation started."],
  ["Routine Antenatal Care", "28 weeks gestation. BP, urine protein, fundal height all within normal limits."],
  ["HIV (on ART)", "Viral load undetectable. CD4 count 680. Continue current ART regimen."],
  ["Tuberculosis (Pulmonary)", "AFB sputum smear positive. DOTS initiated. Rifampicin, Isoniazid, Pyrazinamide, Ethambutol."],
  ["Chronic Kidney Disease (Stage 3)", "eGFR 42 mL/min. Dietary phosphate restriction. ACE inhibitor adjusted."],
  ["Routine Follow-up", "Vitals stable. Medications continued unchanged. Next review in 3 months."],
  ["Hypertensive Urgency", "SBP 178mmHg. Sublingual nifedipine administered. BP controlled on observation."],
  ["Acute Appendicitis", "CT confirmed. Emergency appendicectomy performed. Uncomplicated recovery."],
];
const MED_POOL = [
  { name: "Amlodipine",       dosage: "5mg",       frequency: "Once daily" },
  { name: "Lisinopril",       dosage: "10mg",       frequency: "Once daily" },
  { name: "Metformin",        dosage: "500mg",      frequency: "Twice daily" },
  { name: "Glibenclamide",    dosage: "5mg",        frequency: "Once daily before breakfast" },
  { name: "Artemether-Lumefantrine", dosage: "80/480mg", frequency: "Twice daily × 3 days" },
  { name: "Amoxicillin",      dosage: "500mg",      frequency: "Three times daily" },
  { name: "Ciprofloxacin",    dosage: "500mg",      frequency: "Twice daily" },
  { name: "Omeprazole",       dosage: "20mg",       frequency: "Once daily before meals" },
  { name: "Salbutamol inhaler", dosage: "100mcg",   frequency: "As needed" },
  { name: "Beclomethasone inhaler", dosage: "200mcg", frequency: "Twice daily" },
  { name: "Hydroxyurea",      dosage: "500mg",      frequency: "Once daily" },
  { name: "Tenofovir/Lamivudine/Efavirenz", dosage: "300/300/600mg", frequency: "Once nightly" },
  { name: "Rifampicin",       dosage: "600mg",      frequency: "Once daily" },
  { name: "Ferrous Sulphate", dosage: "200mg",      frequency: "Three times daily" },
  { name: "Folic Acid",       dosage: "5mg",        frequency: "Once daily" },
  { name: "Enalapril",        dosage: "5mg",        frequency: "Twice daily" },
  { name: "Furosemide",       dosage: "40mg",       frequency: "Once daily in the morning" },
  { name: "Spironolactone",   dosage: "25mg",       frequency: "Once daily" },
  { name: "Atorvastatin",     dosage: "20mg",       frequency: "Once nightly" },
  { name: "Aspirin",          dosage: "75mg",       frequency: "Once daily" },
  { name: "Nitrofurantoin",   dosage: "100mg",      frequency: "Twice daily" },
  { name: "Prednisolone",     dosage: "30mg",       frequency: "Once daily (tapering)" },
  { name: "Diazepam",         dosage: "5mg",        frequency: "At night" },
  { name: "Tramadol",         dosage: "50mg",       frequency: "As needed (max 3×/day)" },
  { name: "Nifedipine",       dosage: "20mg",       frequency: "Twice daily" },
];
const ALLERGY_POOL = [
  { substance: "Penicillin",          reaction: "Urticaria (hives)",        severity: "moderate" },
  { substance: "Sulfonamides",        reaction: "Skin rash",                severity: "mild"     },
  { substance: "NSAIDs (Ibuprofen)",  reaction: "Bronchospasm",             severity: "severe"   },
  { substance: "Aspirin",             reaction: "Angioedema",               severity: "severe"   },
  { substance: "Tetracycline",        reaction: "Photosensitivity rash",    severity: "mild"     },
  { substance: "Cotrimoxazole",       reaction: "Stevens-Johnson syndrome", severity: "severe"   },
  { substance: "Metronidazole",       reaction: "Nausea and vomiting",      severity: "mild"     },
  { substance: "Latex",               reaction: "Contact dermatitis",       severity: "moderate" },
  { substance: "Codeine",             reaction: "Severe pruritus",          severity: "moderate" },
  { substance: "Chloroquine",         reaction: "Visual disturbance",       severity: "moderate" },
];
const LAB_POOL = [
  { test: "Fasting Blood Glucose",    unit: "mg/dL",   low: 70, high: 180, ref: "70–100",    critLow: 55,  critHigh: 250 },
  { test: "HbA1c",                    unit: "%",       low: 5.5, high: 9.5, ref: "<6.5",      critLow: 4,   critHigh: 12  },
  { test: "Serum Creatinine",         unit: "mg/dL",   low: 0.6, high: 2.5, ref: "0.7–1.3",  critLow: 0,   critHigh: 4   },
  { test: "Full Blood Count – Hb",    unit: "g/dL",    low: 7.0, high: 16.5, ref: "12–16",   critLow: 5,   critHigh: 20  },
  { test: "Full Blood Count – WBC",   unit: "×10³/µL", low: 3.5, high: 12,   ref: "4.0–11.0", critLow: 1,  critHigh: 30  },
  { test: "Serum Sodium",             unit: "mmol/L",  low: 130, high: 148, ref: "136–145",  critLow: 120, critHigh: 160 },
  { test: "Serum Potassium",          unit: "mmol/L",  low: 3.0, high: 5.5, ref: "3.5–5.0",  critLow: 2.5, critHigh: 6.5 },
  { test: "ALT (SGPT)",              unit: "U/L",     low: 10,  high: 80,  ref: "7–40",     critLow: 0,   critHigh: 200 },
  { test: "Total Bilirubin",          unit: "mg/dL",   low: 0.3, high: 3.5, ref: "0.2–1.2",  critLow: 0,   critHigh: 8   },
  { test: "Lipid Panel – LDL",        unit: "mg/dL",   low: 60,  high: 200, ref: "<100",     critLow: 0,   critHigh: 250 },
  { test: "Lipid Panel – HDL",        unit: "mg/dL",   low: 25,  high: 70,  ref: ">40",      critLow: 10,  critHigh: 0   },
  { test: "Serum Urea",              unit: "mmol/L",  low: 2.5, high: 12,  ref: "2.5–7.5",  critLow: 0,   critHigh: 25  },
  { test: "CD4 Count",               unit: "cells/µL", low: 200, high: 900, ref: "500–1200", critLow: 100, critHigh: 0   },
  { test: "Malaria Parasite (RDT)",  unit: "",        low: 0,   high: 1,   ref: "Negative",  critLow: 0,   critHigh: 0   },
  { test: "Urine Protein (dipstick)", unit: "+",       low: 0,   high: 3,   ref: "Negative",  critLow: 0,   critHigh: 0   },
];

function labStatus(lab, val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val === "Negative" ? "normal" : "abnormal";
  if (lab.critHigh && n >= lab.critHigh) return "critical";
  if (lab.critLow && n <= lab.critLow) return "critical";
  if (n < lab.low || n > lab.high) return "abnormal";
  return "normal";
}

// ── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  // 1. Fetch all patients + facilities
  const { data: patients, error: pErr } = await supabase.from("patients").select("id, first_name, last_name, facility_id");
  if (pErr) { console.error("Error fetching patients:", pErr.message); process.exit(1); }
  if (!patients.length) { console.log("No patients found in DB — nothing to seed."); process.exit(0); }

  const { data: facilities } = await supabase.from("facilities").select("id, name");
  FACILITIES.push(...(facilities || []));

  console.log(`Seeding clinical data for ${patients.length} patients...`);

  for (const patient of patients) {
    const facilityId   = patient.facility_id || (FACILITIES[0]?.id ?? null);
    const facilityName = FACILITIES.find((f) => f.id === facilityId)?.name ?? "Unknown Facility";
    const pid          = patient.id;

    // ── Encounters (3–6 per patient) ────────────────────────────────────────
    const encounterCount = randInt(3, 6);
    const encounterRows  = [];
    for (let i = 0; i < encounterCount; i++) {
      const [diagnosis, notes] = rand(DIAGNOSES);
      const fac = rand(FACILITIES) ?? { id: facilityId, name: facilityName };
      encounterRows.push({
        patient_id:     pid,
        facility_id:    fac.id,
        facility_name:  fac.name,
        practitioner:   rand(PRACTITIONERS),
        encounter_date: pastDate(i * 45, i * 45 + 60),
        type:           rand(ENCOUNTER_TYPES),
        diagnosis,
        notes,
        status:         i === 0 ? rand(["completed", "in-progress"]) : "completed",
      });
    }

    // ── Vital Records (4–7 per patient) ─────────────────────────────────────
    const vitalCount = randInt(4, 7);
    const vitalRows  = [];
    for (let i = 0; i < vitalCount; i++) {
      const fac = rand(FACILITIES) ?? { id: facilityId, name: facilityName };
      vitalRows.push({
        patient_id:    pid,
        facility_id:   fac.id,
        facility_name: fac.name,
        recorded_date: pastDate(i * 30, i * 30 + 45),
        systolic:      randInt(100, 180),
        diastolic:     randInt(60, 110),
        heart_rate:    randInt(58, 105),
        temperature:   randFloat(36.0, 39.5, 1),
        weight:        randFloat(45, 110, 1),
        spo2:          randInt(92, 100),
      });
    }

    // ── Medications (2–4 per patient) ────────────────────────────────────────
    const shuffledMeds = [...MED_POOL].sort(() => Math.random() - 0.5).slice(0, randInt(2, 4));
    const medRows = shuffledMeds.map((m, i) => {
      const fac = rand(FACILITIES) ?? { id: facilityId, name: facilityName };
      const startDate = pastDate(i * 60 + 10, i * 60 + 120);
      const status    = i === 0 ? "active" : rand(["active", "completed", "discontinued"]);
      return {
        patient_id:    pid,
        facility_id:   fac.id,
        facility_name: fac.name,
        name:          m.name,
        dosage:        m.dosage,
        frequency:     m.frequency,
        prescribed_by: rand(PRACTITIONERS),
        start_date:    startDate,
        end_date:      status === "completed" ? pastDate(5, 30) : (status === "discontinued" ? pastDate(10, 60) : null),
        status,
      };
    });

    // ── Allergies (0–2 per patient, 40% chance of having any) ───────────────
    const allergyRows = [];
    if (Math.random() < 0.6) {
      const n = randInt(1, 2);
      const shuffled = [...ALLERGY_POOL].sort(() => Math.random() - 0.5).slice(0, n);
      for (const a of shuffled) {
        const fac = rand(FACILITIES) ?? { id: facilityId, name: facilityName };
        allergyRows.push({
          patient_id:    pid,
          facility_id:   fac.id,
          facility_name: fac.name,
          substance:     a.substance,
          reaction:      a.reaction,
          severity:      a.severity,
          reported_by:   rand(PRACTITIONERS),
          date_recorded: pastDate(60, 400),
        });
      }
    }

    // ── Lab Results (3–6 per patient) ────────────────────────────────────────
    const shuffledLabs = [...LAB_POOL].sort(() => Math.random() - 0.5).slice(0, randInt(3, 6));
    const labRows = shuffledLabs.map((lab) => {
      const fac = rand(FACILITIES) ?? { id: facilityId, name: facilityName };
      let result;
      if (lab.test === "Malaria Parasite (RDT)") {
        result = rand(["Negative", "Positive"]);
      } else if (lab.test === "Urine Protein (dipstick)") {
        result = rand(["Negative", "+", "++", "+++"]);
      } else {
        result = String(randFloat(lab.low * 0.8, lab.high * 1.2, 1));
      }
      return {
        patient_id:     pid,
        facility_id:    fac.id,
        facility_name:  fac.name,
        test:           lab.test,
        result,
        unit:           lab.unit,
        reference_range: lab.ref,
        result_date:    pastDate(10, 180),
        status:         labStatus(lab, result),
      };
    });

    // ── Insert all ────────────────────────────────────────────────────────────
    const inserts = await Promise.all([
      supabase.from("encounters").insert(encounterRows),
      supabase.from("vital_records").insert(vitalRows),
      supabase.from("medications").insert(medRows),
      allergyRows.length ? supabase.from("allergies").insert(allergyRows) : Promise.resolve({ error: null }),
      supabase.from("lab_results").insert(labRows),
    ]);

    const errors = inserts.map((r) => r.error).filter(Boolean);
    if (errors.length) {
      console.error(`  ✗ ${patient.first_name} ${patient.last_name}:`, errors.map((e) => e.message).join(", "));
    } else {
      console.log(`  ✓ ${patient.first_name} ${patient.last_name} — ${encounterCount} encounters, ${vitalCount} vitals, ${medRows.length} meds, ${allergyRows.length} allergies, ${labRows.length} labs`);
    }
  }

  console.log("\nDone!");
}

seed().catch((e) => { console.error(e); process.exit(1); });
