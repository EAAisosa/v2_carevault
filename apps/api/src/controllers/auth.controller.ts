import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as authService from "../services/auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string() });
const logoutSchema = z.object({ refreshToken: z.string().optional() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(12) });
const forgotSchema = z.object({ email: z.string().email() });

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  res.status(StatusCodes.OK).json(result);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refreshSession(refreshToken);
  res.status(StatusCodes.OK).json(result);
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = logoutSchema.parse(req.body);
  await authService.logout(refreshToken ?? "");
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
