"use client";

import { useApiMutation } from "@/hooks/useApiQuery";
import type { ResearchProject } from "@repo/types";
import { RESEARCH_KEYS } from "./keys";

export interface CreateProjectVars {
  title: string;
  description: string;
  principalInvestigator: string;
  dataCategories: string[];
}

export function useCreateResearchProject() {
  return useApiMutation<CreateProjectVars, ResearchProject>(
    (c, vars) => c.post<ResearchProject>("/research-projects", vars),
    { invalidates: [RESEARCH_KEYS.mine] }
  );
}
