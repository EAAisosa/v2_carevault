export const AUDIT_LOGS_KEYS = {
  list: (page: number, action: string) =>
    ["audit-logs", page, action] as const,
};
