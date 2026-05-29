"use client";

import { useApiMutation } from "@/hooks/useApiQuery";

export function useResetUserPassword() {
  return useApiMutation<string, unknown>((c, id) =>
    c.post(`/users/${id}/reset-password`)
  );
}
