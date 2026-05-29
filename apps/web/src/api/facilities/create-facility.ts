"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { Facility } from "@repo/types";
import { FACILITIES_KEYS } from "./keys";

export interface CreateFacilityVars {
  name: string;
  location: string;
  state: string;
  facilityCode?: string;
  ehrSystem?: string;
}

export function useCreateFacility() {
  return useApiMutation<CreateFacilityVars, Facility>(
    (c, vars) => c.post<Facility>("/facilities", vars),
    { invalidates: [FACILITIES_KEYS.all] }
  );
}
