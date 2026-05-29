import { PrismaClient } from "@prisma/client";

// One Prisma instance per process. The globalThis stash prevents tsx/nodemon
// hot-reload from leaking connections in dev. In production it's a normal singleton.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env["NODE_ENV"] === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
