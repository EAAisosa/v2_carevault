import type {
  FHIRBundle,
  FHIRPatient,
  FHIREncounter,
  FHIRObservation,
  FHIRMedicationRequest,
} from "../types";

export interface NormalizedRecord {
  patientName: string;
  nin: string;
  dataType: string;
  summary: string;
  practitioner: string;
  fhirResourceType: string;
  fhirPayload: unknown;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending";
  conflictType: string | null;
}

/** Extract Nigerian NIN from FHIR Patient identifiers */
export function extractNIN(patient: FHIRPatient): string {
  const ninId = patient.identifier?.find(
    (id) => id.system === "urn:ng:nin" || id.system?.includes("national-id")
  );
  return ninId?.value ?? "";
}

/** Build a display name from FHIR HumanName */
export function extractPatientName(patient: FHIRPatient): string {
  if (!patient.name?.[0]) return "Unknown Patient";
  const name = patient.name[0];
  return `${name.given?.join(" ") ?? ""} ${name.family ?? ""}`.trim() || "Unknown Patient";
}

/** Map a FHIR R4 Bundle to CareVault staged record payloads */
export function mapFHIRBundle(bundle: FHIRBundle): NormalizedRecord[] {
  const records: NormalizedRecord[] = [];
  const entries = bundle.entry ?? [];

  let patient: FHIRPatient | null = null;
  const encounters: FHIREncounter[] = [];
  const observations: FHIRObservation[] = [];
  const medicationRequests: FHIRMedicationRequest[] = [];
  const others: Array<{ resourceType: string; [k: string]: unknown }> = [];

  for (const entry of entries) {
    const r = entry.resource;
    if (!r) continue;
    switch (r.resourceType) {
      case "Patient":
        patient = r as FHIRPatient;
        break;
      case "Encounter":
        encounters.push(r as FHIREncounter);
        break;
      case "Observation":
        observations.push(r as FHIRObservation);
        break;
      case "MedicationRequest":
        medicationRequests.push(r as FHIRMedicationRequest);
        break;
      default:
        others.push(r as { resourceType: string });
    }
  }

  const patientName = patient ? extractPatientName(patient) : "Unknown Patient";
  const nin = patient ? extractNIN(patient) : "";

  for (const enc of encounters) {
    records.push({
      patientName,
      nin,
      dataType: "Encounter + Diagnosis",
      summary: `Encounter: ${enc.reasonCode?.[0]?.text ?? enc.class?.code ?? "General visit"}. Status: ${enc.status ?? "unknown"}.`,
      practitioner: "",
      fhirResourceType: "Encounter",
      fhirPayload: enc,
      priority: "medium",
      status: "pending",
      conflictType: null,
    });
  }

  for (const obs of observations) {
    const display =
      obs.code?.text ?? obs.code?.coding?.[0]?.display ?? "Observation";
    const value = obs.valueQuantity
      ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}`
      : "N/A";
    const isLab = obs.code?.coding?.[0]?.code?.startsWith("LP") ?? false;
    records.push({
      patientName,
      nin,
      dataType: isLab ? "Lab Results" : "Vitals + Labs",
      summary: `${display}: ${value}`,
      practitioner: "",
      fhirResourceType: "Observation",
      fhirPayload: obs,
      priority: "medium",
      status: "pending",
      conflictType: null,
    });
  }

  for (const med of medicationRequests) {
    const name =
      med.medicationCodeableConcept?.text ??
      med.medicationCodeableConcept?.coding?.[0]?.display ??
      "Unknown medication";
    records.push({
      patientName,
      nin,
      dataType: "Medication",
      summary: `Medication: ${name}. Status: ${med.status ?? "unknown"}.`,
      practitioner: "",
      fhirResourceType: "MedicationRequest",
      fhirPayload: med,
      priority: "medium",
      status: "pending",
      conflictType: null,
    });
  }

  for (const res of others) {
    records.push({
      patientName,
      nin,
      dataType: res.resourceType ?? "Unknown",
      summary: `${res.resourceType} resource received`,
      practitioner: "",
      fhirResourceType: res.resourceType ?? "Unknown",
      fhirPayload: res,
      priority: "low",
      status: "pending",
      conflictType: null,
    });
  }

  return records;
}
