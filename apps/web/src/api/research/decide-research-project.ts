"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { ResearchProject } from "@repo/types";
import { RESEARCH_KEYS } from "./keys";

export function useDecideResearchProject() {
  return useApiMutation<{ id: string; status: "approved" | "rejected" }, ResearchProject>(
    (c, { id, status }) =>
      c.patch<ResearchProject>(`/research-projects/${id}`, { status }),
    { invalidates: [RESEARCH_KEYS.admin, RESEARCH_KEYS.mine] }
  );
}
