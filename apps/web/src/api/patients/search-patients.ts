"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { PatientSearchResponse, PatientSearchVars } from "./types";

// POST /patients/search so PII (names, DOB, phone) stays out of the URL.
export function useSearchPatients() {
  return useApiMutation<PatientSearchVars, PatientSearchResponse>((c, vars) =>
    c.post<PatientSearchResponse>("/patients/search", vars)
  );
}
