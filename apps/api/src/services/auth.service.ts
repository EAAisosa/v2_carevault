import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import type { AppRole } from "@repo/types";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    role: AppRole;
    facilityId: string | null;
    fullName: string;
  };
}

const ACCESS_TTL_SECONDS = 8 * 60 * 60; // 8 hours
const REFRESH_TTL_DAYS = 30;

function signAccess(userId: string, email: string): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  const token = jwt.sign({ sub: userId, email }, config.jwtSecret, { expiresIn: ACCESS_TTL_SECONDS });
  return { token, expiresAt };
}

async function issueTokens(
  profile: { id: string; email: string; facilityId: string | null; fullName: string },
  userRole: { role: AppRole } | null
): Promise<LoginResult> {
  const { token: accessToken, expiresAt } = signAccess(profile.id, profile.email);

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + REFRESH_TTL_DAYS);
  const refreshToken = crypto.randomUUID();

  await prisma.refreshToken.create({
    data: { userId: profile.id, token: refreshToken, expiresAt: refreshExpiry },
  });

  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: {
      id: profile.id,
      email: profile.email,
      role: (userRole?.role ?? "clinician") as AppRole,
      facilityId: profile.facilityId ?? null,
      fullName: profile.fullName,
    },
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const profile = await prisma.profile.findUnique({
    where: { email },
    include: { userRole: true },
  });

  const invalid = !profile || !profile.isActive || !profile.passwordHash;
  // Always run bcrypt to prevent timing attacks
  const hashToCheck = profile?.passwordHash ?? "$2b$12$invalidhashplaceholderxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (invalid || !valid) {
    throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
  }

  await prisma.profile.update({ where: { id: profile.id }, data: { lastSignIn: new Date() } });
  return issueTokens(profile, profile.userRole);
}

export async function refreshSession(refreshToken: string): Promise<LoginResult> {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", StatusCodes.UNAUTHORIZED);
  }

  // Rotate: revoke old token before issuing new one
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const profile = await prisma.profile.findUnique({
    where: { id: stored.userId },
    include: { userRole: true },
  });

  if (!profile || !profile.isActive) {
    throw new AppError("User account is inactive", StatusCodes.UNAUTHORIZED);
  }

  return issueTokens(profile, profile.userRole);
}

export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  // Always succeed silently — never reveal whether email exists
  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) return;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({ data: { userId: profile.id, token, expiresAt } });

  // TODO: wire email provider — reset URL is:
  // `${config.appUrl}/reset-password?token=${token}`
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    throw new AppError("Invalid or expired reset token", StatusCodes.UNAUTHORIZED);
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.profile.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function getMe(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      facility: { select: { id: true, name: true } },
      userRole: true,
    },
  });

  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  return {
    id: profile.id,
    email: profile.email,
    role: (profile.userRole?.role ?? "clinician") as AppRole,
    facilityId: profile.facilityId ?? null,
    facilityName: profile.facility?.name ?? null,
    fullName: profile.fullName,
  };
}
