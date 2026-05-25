// packages/fhir/src/index.ts
// Pure TypeScript — no Supabase, Deno, or Node-specific dependencies.
// Portable to Express, AWS Lambda, or any other runtime.

export type { FHIRPatient, FHIREncounter, FHIRObservation, FHIRMedicationRequest, FHIRBundle } from "./types";
export type { EHRConfig, NormalizedRecord } from "./transport/client";
export { mapFHIRBundle, extractNIN, extractPatientName } from "./mappers/bundle";
export { getAuthHeaders } from "./transport/auth";
export { pullFromEHR, pushToEHR } from "./transport/client";
