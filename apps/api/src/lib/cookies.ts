import type { Request, Response } from "express";
import { config } from "../config";

// OAuth 2.0 BCP for browser apps: the long-lived refresh token lives in an
// httpOnly cookie so XSS can't read it. The short-lived access token is returned
// in the JSON body and held in memory by the SPA — never persisted to storage.
//
// SameSite=Lax is sufficient because /api/v1/auth/refresh and /logout are
// idempotent POSTs that re-issue a token; we also check the Origin header on
// state-changing requests in app.ts for defence in depth. Move to SameSite=Strict
// once the web and api share a registrable domain and Next.js rewrites are in.

export const REFRESH_COOKIE = "carevault_refresh";

const COMMON = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/api/v1/auth",
};

export function setRefreshCookie(res: Response, token: string, maxAgeSec: number) {
  res.cookie(REFRESH_COOKIE, token, {
    ...COMMON,
    secure: config.isProd,
    maxAge: maxAgeSec * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...COMMON, secure: config.isProd });
}

export function readRefreshCookie(req: Request): string | null {
  const v = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE];
  return typeof v === "string" && v.length > 0 ? v : null;
}
