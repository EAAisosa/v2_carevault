"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { Facility } from "@repo/types";
import { FACILITIES_KEYS } from "./keys";

export function useFacilities(options?: { enabled?: boolean }) {
  return useApiQuery<Facility[]>(
    FACILITIES_KEYS.all,
    (c) => c.get<Facility[]>("/facilities"),
    options
  );
}
