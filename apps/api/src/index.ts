import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const PORT = config.port ?? 4000;

async function main() {
  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, "CareVault API started");
  });

  async function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Server and DB connections closed");
      process.exit(0);
    });

    // Force exit if graceful shutdown hangs
    setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "Uncaught exception — exiting");
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start API server");
  process.exit(1);
});
