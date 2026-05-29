"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { StagedRecord } from "@repo/types";
import { STAGED_RECORDS_KEYS } from "./keys";

export function useApproveStagedRecord() {
  return useApiMutation<StagedRecord, unknown>(
    (c, r) => c.post(`/staged-records/${r.id}/approve`),
    { invalidates: [STAGED_RECORDS_KEYS.all] }
  );
}
