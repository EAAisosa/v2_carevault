"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { Facility, FacilityStatus } from "@repo/types";
import { FACILITIES_KEYS } from "./keys";

export function useUpdateFacilityStatus() {
  return useApiMutation<{ id: string; status: FacilityStatus }, Facility>(
    (c, { id, status }) =>
      c.patch<Facility>(`/facilities/${id}/status`, { status }),
    { invalidates: [FACILITIES_KEYS.all] }
  );
}
