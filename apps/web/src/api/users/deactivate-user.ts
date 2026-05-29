"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import { USERS_KEYS } from "./keys";

export function useDeactivateUser() {
  return useApiMutation<string, unknown>(
    (c, id) => c.post(`/users/${id}/deactivate`),
    { invalidates: [USERS_KEYS.all] }
  );
}
