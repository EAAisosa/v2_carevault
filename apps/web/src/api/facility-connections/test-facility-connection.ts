"use client";

import { useApiMutation } from "@/hooks/useApiQuery";

export function useTestFacilityConnection() {
  return useApiMutation<string, { ok: boolean; message: string }>(
    (c, id) => c.post(`/facility-connections/${id}/test`)
  );
}
