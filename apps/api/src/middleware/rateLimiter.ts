import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";

const json429 = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) =>
  res.status(StatusCodes.TOO_MANY_REQUESTS).json({ error: "Too many requests — please slow down" });

/** Strict limit for auth endpoints (login, password reset) */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

/** General API limit */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

/** Internal cron endpoint — very strict */
export const internalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});
