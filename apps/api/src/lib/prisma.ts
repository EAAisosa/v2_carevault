// Re-export the monorepo's shared Prisma singleton so all services route through
// one connection pool. Keeping this thin barrel lets existing imports keep working
// while @repo/db remains the single source of truth.
export { prisma } from "@repo/db";
export type { PrismaClient } from "@repo/db";
