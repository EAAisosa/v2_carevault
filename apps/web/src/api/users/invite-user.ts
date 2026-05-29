"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import { USERS_KEYS } from "./keys";
import type { ManagedUser, InviteUserVars } from "./types";

export function useInviteUser() {
  return useApiMutation<InviteUserVars, ManagedUser>(
    (c, vars) => c.post<ManagedUser>("/users/invite", vars),
    { invalidates: [USERS_KEYS.all] }
  );
}
