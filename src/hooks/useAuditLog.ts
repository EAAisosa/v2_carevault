import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AuditAction =
  | "PATIENT_SEARCH"
  | "RECORD_VIEW"
  | "BREAK_GLASS_ACCESS"
  | "STAGING_APPROVE"
  | "STAGING_REJECT"
  | "STAGING_FLAG"
  | "STAGING_NEEDS_REVIEW"
  | "USER_INVITE"
  | "USER_DEACTIVATE"
  | "USER_ACTIVATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "USER_PASSWORD_RESET"
  | "USER_INVITE_RESENT"
  | "FACILITY_STATUS_CHANGE";

interface AuditOptions {
  resource: string;
  status?: "success" | "failure" | "warning";
  metadata?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user, fullName, role, facilityId } = useAuth();

  const log = useCallback(
    async (action: AuditAction, opts: AuditOptions) => {
      if (!user) return;
      await supabase.from("audit_logs").insert({
        user_id:      user.id,
        user_name:    fullName || user.email || "Unknown",
        role,
        action,
        resource:     opts.resource,
        facility_id:  facilityId,
        facility_name: "",   // resolved server-side via FK if needed
        status:       opts.status ?? "success",
        metadata:     opts.metadata ?? null,
      });
    },
    [user, fullName, role, facilityId]
  );

  return { log };
}
