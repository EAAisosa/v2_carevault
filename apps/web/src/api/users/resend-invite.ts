"use client";

import { useApiMutation } from "@/hooks/useApiQuery";

export function useResendInvite() {
  return useApiMutation<string, unknown>((c, id) =>
    c.post(`/users/${id}/resend-invite`)
  );
}
