"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import { FACILITY_CONNECTIONS_KEYS } from "./keys";

export function useDeleteFacilityConnection() {
  return useApiMutation<string, void>(
    (c, id) => c.delete<void>(`/facility-connections/${id}`),
    { invalidates: [FACILITY_CONNECTIONS_KEYS.all] }
  );
}
