"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { AuditLog } from "@repo/types";
import { AUDIT_LOGS_KEYS } from "./keys";

export interface AuditLogsResponse {
  records: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAuditLogs(params: { page: number; pageSize: number; action: string }) {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.action) qs.set("action", params.action);
  return useApiQuery<AuditLogsResponse>(
    AUDIT_LOGS_KEYS.list(params.page, params.action),
    (c) => c.get<AuditLogsResponse>(`/audit-logs?${qs}`)
  );
}
