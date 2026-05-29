import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as authService from "../services/auth.service";
import { REFRESH_TTL_SECONDS } from "../services/auth.service";
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from "../lib/cookies";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resetSchema = z.object({ token: z.string(), password: z.string().min(12) });
const forgotSchema = z.object({ email: z.string().email() });

// The wire-shape sent back to the SPA. The refreshToken is intentionally
// omitted — it goes in an httpOnly cookie set by the helper below.
function publicSession(result: authService.LoginResult) {
  return {
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
    user: result.user,
  };
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  setRefreshCookie(res, result.refreshToken, REFRESH_TTL_SECONDS);
  res.status(StatusCodes.OK).json(publicSession(result));
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = readRefreshCookie(req);
  if (!refreshToken) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing refresh token" });
    return;
  }
  const result = await authService.refreshSession(refreshToken);
  setRefreshCookie(res, result.refreshToken, REFRESH_TTL_SECONDS);
  res.status(StatusCodes.OK).json(publicSession(result));
}

export async function logout(req: Request, res: Response) {
  const token = readRefreshCookie(req);
  await authService.logout(token ?? "");
  clearRefreshCookie(res);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotSchema.parse(req.body);
  await authService.forgotPassword(email);
  // Always 200 — never reveal whether email exists
  res.status(StatusCodes.OK).json({ message: "If that email exists, a reset link has been sent" });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetSchema.parse(req.body);
  await authService.resetPassword(token, password);
  res.status(StatusCodes.OK).json({ message: "Password updated successfully" });
}

export async function getMe(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id);
  res.status(StatusCodes.OK).json(user);
}
