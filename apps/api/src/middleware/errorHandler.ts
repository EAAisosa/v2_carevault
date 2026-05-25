import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logger } from "../lib/logger";
import { config } from "../config";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId;

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: "Validation failed",
      details: err.flatten(),
      correlationId,
    });
    return;
  }

  // Prisma unique constraint violations → 409
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(StatusCodes.CONFLICT).json({
        error: "A record with those values already exists",
        correlationId,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Record not found", correlationId });
      return;
    }
  }

  // AppError — errors thrown with a statusCode property
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, correlationId });
    return;
  }

  // Unknown errors
  logger.error({ err, correlationId, url: req.url, method: req.method }, "Unhandled error");

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: config.isProd ? "Internal server error" : String(err),
    correlationId,
  });
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.name = "AppError";
  }
}
