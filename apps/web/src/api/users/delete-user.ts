"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import { USERS_KEYS } from "./keys";

export function useDeleteUser() {
  return useApiMutation<string, void>(
    (c, id) => c.delete<void>(`/users/${id}`),
    { invalidates: [USERS_KEYS.all] }
  );
}
