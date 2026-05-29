"use client";

import { useMutation } from "@tanstack/react-query";
import { createApiClient } from "@/lib/api-client";

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      createApiClient(null).post("/auth/forgot-password", { email }),
  });
}
