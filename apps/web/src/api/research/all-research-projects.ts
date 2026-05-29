"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { ResearchProject } from "@repo/types";
import { RESEARCH_KEYS } from "./keys";

export function useAllResearchProjects() {
  return useApiQuery<ResearchProject[]>(RESEARCH_KEYS.admin, (c) =>
    c.get<ResearchProject[]>("/research-projects")
  );
}
