"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { PatientRecord } from "@repo/types";
import { PATIENTS_KEYS } from "./keys";

export function usePatient(id: string | undefined) {
  return useApiQuery<PatientRecord>(
    PATIENTS_KEYS.detail(id ?? ""),
    (c) => c.get<PatientRecord>(`/patients/${id}`),
    { enabled: !!id }
  );
}
