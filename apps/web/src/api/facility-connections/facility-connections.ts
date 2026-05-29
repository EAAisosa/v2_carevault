"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { FacilityConnection } from "@repo/types";
import { FACILITY_CONNECTIONS_KEYS } from "./keys";

export function useFacilityConnections() {
  return useApiQuery<FacilityConnection[]>(
    FACILITY_CONNECTIONS_KEYS.all,
    (c) => c.get<FacilityConnection[]>("/facility-connections")
  );
}
