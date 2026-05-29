"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { StagedRecord } from "@repo/types";
import { STAGED_RECORDS_KEYS } from "./keys";

export interface StagedListResponse {
  records: StagedRecord[];
}

export function useStagedRecords(params: { status?: string; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs}` : "";
  return useApiQuery<StagedListResponse>(
    STAGED_RECORDS_KEYS.list(params),
    (c) => c.get<StagedListResponse>(`/staged-records${suffix}`)
  );
}
