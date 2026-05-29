"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import { USERS_KEYS } from "./keys";

export function useActivateUser() {
  return useApiMutation<string, unknown>(
    (c, id) => c.post(`/users/${id}/activate`),
    { invalidates: [USERS_KEYS.all] }
  );
}
