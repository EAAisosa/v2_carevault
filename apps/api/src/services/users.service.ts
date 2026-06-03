import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import { config } from "../config";
import type { AppRole } from "@repo/types";
import { userInviteEmail, passwordResetEmail } from "../lib/email";

function assertFacilityScope(
  role: AppRole,
  callerFacilityId: string | null,
  targetFacilityId: string | null
) {
  if (role !== "carevault_admin" && targetFacilityId !== callerFacilityId) {
    throw new AppError("User is not in your facility", StatusCodes.FORBIDDEN);
  }
}

export async function listUsers(role: AppRole, callerFacilityId: string | null) {
  const where = role !== "carevault_admin" && callerFacilityId
    ? { facilityId: callerFacilityId }
    : {};

  const profiles = await prisma.profile.findMany({
    where,
    include: {
      facility: { select: { id: true, name: true } },
      userRole: true,
    },
    orderBy: { fullName: "asc" },
  });

  return profiles.map((profile) => ({
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    role: (profile.userRole?.role ?? "clinician") as AppRole,
    facilityId: profile.facilityId,
    facilityName: profile.facility?.name ?? "—",
    banned: !profile.isActive,
    confirmed: true,
    lastSignIn: profile.lastSignIn?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
  }));
}

export async function inviteUser(
  data: { email: string; fullName: string; role: AppRole; facilityId?: string },
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  const { email, fullName, role, facilityId } = data;

  if (role === "carevault_admin" && callerRole !== "carevault_admin") {
    throw new AppError("Only CareVault Admins can assign the CareVault Admin role", StatusCodes.FORBIDDEN);
  }
  if (role === "researcher" && callerRole !== "carevault_admin") {
    throw new AppError("Only CareVault Admins can invite Researchers", StatusCodes.FORBIDDEN);
  }

  const needsFacility = role !== "carevault_admin" && role !== "researcher";
  if (needsFacility && !facilityId) {
    throw new AppError("Facility is required for this role", StatusCodes.BAD_REQUEST);
  }
  if (needsFacility && callerRole !== "carevault_admin" && facilityId !== callerFacilityId) {
    throw new AppError("Cannot invite users to other facilities", StatusCodes.FORBIDDEN);
  }

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(
      `A user with email ${email} already exists. Use "Resend Invite" or "Reset Password" instead.`,
      StatusCodes.CONFLICT
    );
  }

  const profile = await prisma.profile.create({
    data: { email, fullName, facilityId: facilityId ?? null, passwordHash: "" },
  });

  await prisma.userRole.create({ data: { userId: profile.id, role } });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.passwordResetToken.create({ data: { userId: profile.id, token, expiresAt } });

  const inviteUrl = `${config.appUrl}/reset-password?token=${token}`;
  await userInviteEmail({ to: email, fullName, inviteUrl, invitedBy: "CareVault Admin" });

  return { id: profile.id, email: profile.email };
}

export async function updateUserRole(
  userId: string,
  newRole: AppRole,
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  if (newRole === "carevault_admin" && callerRole !== "carevault_admin") {
    throw new AppError("Only CareVault Admins can assign the CareVault Admin role", StatusCodes.FORBIDDEN);
  }
  if (newRole === "researcher" && callerRole !== "carevault_admin") {
    throw new AppError("Only CareVault Admins can assign the Researcher role", StatusCodes.FORBIDDEN);
  }

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  assertFacilityScope(callerRole, callerFacilityId, profile?.facilityId ?? null);

  await prisma.userRole.upsert({
    where: { userId },
    update: { role: newRole },
    create: { userId, role: newRole },
  });
}

export async function deactivateUser(
  userId: string,
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  assertFacilityScope(callerRole, callerFacilityId, profile.facilityId ?? null);

  await prisma.profile.update({ where: { id: userId }, data: { isActive: false } });
}

export async function activateUser(
  userId: string,
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  assertFacilityScope(callerRole, callerFacilityId, profile.facilityId ?? null);

  await prisma.profile.update({ where: { id: userId }, data: { isActive: true } });
}

export async function deleteUser(
  userId: string,
  callerId: string,
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  if (userId === callerId) throw new AppError("Cannot delete yourself", StatusCodes.BAD_REQUEST);

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  assertFacilityScope(callerRole, callerFacilityId, profile.facilityId ?? null);

  await prisma.profile.delete({ where: { id: userId } });
}

export async function resetUserPassword(
  userId: string,
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  assertFacilityScope(callerRole, callerFacilityId, profile.facilityId ?? null);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.passwordResetToken.create({ data: { userId, token, expiresAt } });

  const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
  await passwordResetEmail({ to: profile.email, resetUrl, appUrl: config.appUrl });

  return { message: `Password reset email sent to ${profile.email}` };
}

export async function resendInvite(
  userId: string,
  callerRole: AppRole,
  callerFacilityId: string | null
) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  assertFacilityScope(callerRole, callerFacilityId, profile.facilityId ?? null);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.passwordResetToken.create({ data: { userId, token, expiresAt } });

  return {
    message: `Invite link generated for ${profile.email}`,
    inviteUrl: `${config.appUrl}/reset-password?token=${token}`,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const valid = profile.passwordHash
    ? await bcrypt.compare(currentPassword, profile.passwordHash)
    : false;
  if (!valid) throw new AppError("Current password is incorrect", StatusCodes.UNAUTHORIZED);

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.profile.update({ where: { id: userId }, data: { passwordHash: hash } });
}
