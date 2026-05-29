export const PATIENTS_KEYS = {
  all: ["patients"] as const,
  detail: (id: string) => ["patients", id] as const,
};
