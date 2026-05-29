"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import { STAGED_RECORDS_KEYS } from "./keys";

export function useFlagStagedRecord() {
  return useApiMutation<{ id: string }, unknown>(
    (c, { id }) => c.post(`/staged-records/${id}/flag`),
    { invalidates: [STAGED_RECORDS_KEYS.all] }
  );
}
