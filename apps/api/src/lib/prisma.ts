import { PrismaClient } from "@prisma/client";
import { config } from "../config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev ? ["error", "warn"] : ["error"],
    datasources: { db: { url: config.db.url } },
  });

if (!config.isProd) globalForPrisma.prisma = prisma;
