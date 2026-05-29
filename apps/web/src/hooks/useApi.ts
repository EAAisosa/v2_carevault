"use client";

import { useMemo } from "react";
import { createApiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

// Single source of truth for an API client wired to the current session.
// On 401 the client transparently calls /auth/refresh and replays the request;
// concurrent 401s share a single refresh thanks to the single-flight gate in
// api-client.ts.
export function useApi() {
  const { accessToken, refresh } = useAuth();
  return useMemo(() => createApiClient(accessToken, refresh), [accessToken, refresh]);
}
