import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as usersService from "../services/users.service";
import * as auditLogsService from "../services/auditLogs.service";

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["clinician", "facility_admin", "carevault_admin", "researcher"]),
  facilityId: z.string().uuid().optional(),
});

const roleSchema = z.object({
  role: z.enum(["clinician", "facility_admin", "carevault_admin", "researcher"]),
});

export async function listUsers(req: Request, res: Response) {
  const users = await usersService.listUsers(req.user!.role, req.user!.facilityId);
  res.status(StatusCodes.OK).json(users);
}

export async function inviteUser(req: Request, res: Response) {
  const data = inviteSchema.parse(req.body);
  const user = await usersService.inviteUser(data, req.user!.role, req.user!.facilityId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_INVITE",
    resource: `User/${user.id}`,
    facilityId: req.user!.facilityId,
    metadata: { invitedEmail: data.email, assignedRole: data.role },
    ipAddress: req.ip,
  });

  res.status(StatusCodes.CREATED).json({ ok: true, user });
}

export async function updateRole(req: Request, res: Response) {
  const { id } = req.params;
  const { role } = roleSchema.parse(req.body);
  await usersService.updateUserRole(id!, role, req.user!.role, req.user!.facilityId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_ROLE_CHANGE",
    resource: `User/${id}`,
    facilityId: req.user!.facilityId,
    metadata: { newRole: role },
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json({ ok: true });
}

export async function deactivateUser(req: Request, res: Response) {
  const { id } = req.params;
  await usersService.deactivateUser(id!, req.user!.role, req.user!.facilityId);
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_DEACTIVATE",
    resource: `User/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });
  res.status(StatusCodes.OK).json({ ok: true });
}

export async function activateUser(req: Request, res: Response) {
  const { id } = req.params;
  await usersService.activateUser(id!, req.user!.role, req.user!.facilityId);
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_ACTIVATE",
    resource: `User/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });
  res.status(StatusCodes.OK).json({ ok: true });
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await usersService.deleteUser(id!, req.user!.id, req.user!.role, req.user!.facilityId);
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_DELETE",
    resource: `User/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });
  res.status(StatusCodes.OK).json({ ok: true });
}

export async function resetUserPassword(req: Request, res: Response) {
  const { id } = req.params;
  const result = await usersService.resetUserPassword(id!, req.user!.role, req.user!.facilityId);
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_PASSWORD_RESET",
    resource: `User/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });
  res.status(StatusCodes.OK).json({ ok: true, ...result });
}

export async function resendInvite(req: Request, res: Response) {
  const { id } = req.params;
  const result = await usersService.resendInvite(id!, req.user!.role, req.user!.facilityId);
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "USER_INVITE_RESENT",
    resource: `User/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });
  res.status(StatusCodes.OK).json({ ok: true, ...result });
}
