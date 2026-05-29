"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { FacilityConnection } from "@repo/types";
import { FACILITY_CONNECTIONS_KEYS } from "./keys";

export interface CreateConnectionVars {
  facilityId: string;
  ehrType: string;
  baseUrl: string;
  authType: "basic" | "oauth2" | "api_key";
  authCredentials: Record<string, unknown>;
  fhirVersion?: string;
  syncDirection?: string;
  syncIntervalMinutes?: number;
}

export function useCreateFacilityConnection() {
  return useApiMutation<CreateConnectionVars, FacilityConnection>(
    (c, vars) => c.post<FacilityConnection>("/facility-connections", vars),
    { invalidates: [FACILITY_CONNECTIONS_KEYS.all] }
  );
}
