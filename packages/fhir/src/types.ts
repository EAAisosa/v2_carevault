// Typed FHIR R4 resource interfaces used across the EHR connector.
// Subset of FHIR R4 — only resources used by CareVault are typed here.

export interface FHIRIdentifier {
  system?: string;
  value?: string;
}

export interface FHIRHumanName {
  family?: string;
  given?: string[];
  use?: string;
}

export interface FHIRCodeableConcept {
  text?: string;
  coding?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;
}

export interface FHIRQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRReference {
  reference?: string;
  display?: string;
}

export interface FHIRDosage {
  text?: string;
  timing?: {
    repeat?: {
      period?: number;
      periodUnit?: string;
    };
  };
}

// ── R4 Resources ───────────────────────────────────────────────────────────

export interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  identifier?: FHIRIdentifier[];
  name?: FHIRHumanName[];
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system?: string; value?: string }>;
  address?: Array<{ city?: string; state?: string; country?: string }>;
}

export interface FHIREncounter {
  resourceType: "Encounter";
  id?: string;
  status?: string;
  class?: { code?: string; display?: string };
  subject?: FHIRReference;
  period?: FHIRPeriod;
  reasonCode?: FHIRCodeableConcept[];
  participant?: Array<{
    individual?: FHIRReference;
  }>;
}

export interface FHIRObservation {
  resourceType: "Observation";
  id?: string;
  status?: string;
  code?: FHIRCodeableConcept;
  subject?: FHIRReference;
  valueQuantity?: FHIRQuantity;
  effectiveDateTime?: string;
  component?: Array<{
    code?: FHIRCodeableConcept;
    valueQuantity?: FHIRQuantity;
  }>;
}

export interface FHIRMedicationRequest {
  resourceType: "MedicationRequest";
  id?: string;
  status?: string;
  medicationCodeableConcept?: FHIRCodeableConcept;
  subject?: FHIRReference;
  authoredOn?: string;
  requester?: FHIRReference;
  dosageInstruction?: FHIRDosage[];
}

export interface FHIRBundleEntry {
  resource?:
    | FHIRPatient
    | FHIREncounter
    | FHIRObservation
    | FHIRMedicationRequest
    | { resourceType: string; [key: string]: unknown };
}

export interface FHIRBundle {
  resourceType: "Bundle";
  type?: string;
  entry?: FHIRBundleEntry[];
}
