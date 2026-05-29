"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import { USERS_KEYS } from "./keys";
import type { ManagedUser } from "./types";

export function useUsers() {
  return useApiQuery<ManagedUser[]>(USERS_KEYS.all, (c) =>
    c.get<ManagedUser[]>("/users")
  );
}
