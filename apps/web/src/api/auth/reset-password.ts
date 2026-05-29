"use client";

import { useMutation } from "@tanstack/react-query";
import { createApiClient } from "@/lib/api-client";

export function useResetPassword() {
  return useMutation({
    mutationFn: (vars: { token: string; password: string }) =>
      createApiClient(null).post("/auth/reset-password", vars),
  });
}
