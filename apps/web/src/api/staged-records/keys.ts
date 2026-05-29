export const STAGED_RECORDS_KEYS = {
  all: ["staged-records"] as const,
  list: (params: { status?: string; pageSize?: number }) =>
    ["staged-records", params] as const,
};
