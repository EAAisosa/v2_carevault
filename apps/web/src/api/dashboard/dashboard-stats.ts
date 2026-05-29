"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { DashboardStats, StagedRecord, SyncLog } from "@repo/types";
import { DASHBOARD_KEYS } from "./keys";

export interface DashboardResponse {
  stats: DashboardStats;
  recentStaging: StagedRecord[];
  recentSyncs: (SyncLog & { facilityName?: string })[];
}

export function useDashboardStats() {
  return useApiQuery<DashboardResponse>(DASHBOARD_KEYS.stats, (c) =>
    c.get<DashboardResponse>("/dashboard/stats")
  );
}
