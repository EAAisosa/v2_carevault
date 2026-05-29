"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { StagedRecord } from "@repo/types";
import { STAGED_RECORDS_KEYS } from "./keys";

export function useNeedsReviewStagedRecord() {
  return useApiMutation<StagedRecord, unknown>(
    (c, r) => c.post(`/staged-records/${r.id}/needs-review`),
    { invalidates: [STAGED_RECORDS_KEYS.all] }
  );
}
