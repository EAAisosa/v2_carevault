"use client";

import { useMemo } from "react";
import { createApiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

export function useApi() {
  const { accessToken } = useAuth();
  return useMemo(() => createApiClient(accessToken), [accessToken]);
}
