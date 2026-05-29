"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { AppRole } from "@repo/types";
import { USERS_KEYS } from "./keys";

export function useUpdateUserRole() {
  return useApiMutation<{ id: string; role: AppRole }, unknown>(
    (c, { id, role }) => c.patch(`/users/${id}/role`, { role }),
    { invalidates: [USERS_KEYS.all] }
  );
}
