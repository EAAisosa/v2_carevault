import "express-async-errors";
import express, { type Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { config } from "./config";
import { logger } from "./lib/logger";
import { correlationId } from "./middleware/correlationId";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";
import { prisma } from "./lib/prisma";

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "X-Correlation-ID"],
    }),
  );

  app.use(
    pinoHttp({
      logger,
      customLogLevel(_req, res) {
        return res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      },
      customSuccessMessage(req, res) {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.newPassword",
        "req.body.credentials",
        "req.body.token",
        "req.body.refreshToken",
        "req.body.authCredentials",
      ],
    }),
  );

  app.use(correlationId);
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", service: "carevault-api", env: config.isProd ? "production" : "development", db: "ok" });
    } catch {
      res.status(503).json({ status: "degraded", service: "carevault-api", db: "unreachable" });
    }
  });

  app.use("/api/v1", apiLimiter, routes);

  app.use(errorHandler);

  return app;
}
