"use client";

import { useApiMutation } from "@/hooks/useApiQuery";

// Manual one-off sync trigger from the connections UI. Lives in this folder
// because the user-facing action is "sync THIS connection now" — even though
// the endpoint itself is under /sync on the backend.
export function useTriggerSync() {
  return useApiMutation<string, unknown>((c, facilityConnectionId) =>
    c.post("/sync/pull", { facilityConnectionId })
  );
}
