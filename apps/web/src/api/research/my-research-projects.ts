"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { ResearchProject } from "@repo/types";
import { RESEARCH_KEYS } from "./keys";

export function useMyResearchProjects() {
  return useApiQuery<ResearchProject[]>(RESEARCH_KEYS.mine, (c) =>
    c.get<ResearchProject[]>("/research-projects/my")
  );
}
