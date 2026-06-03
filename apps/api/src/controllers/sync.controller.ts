import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as syncService from "../services/sync.service";
import * as auditLogsService from "../services/auditLogs.service";

const pullSchema = z.object({
  facilityConnectionId: z.string().uuid(),
});

const pushSchema = z.object({
  facilityConnectionId: z.string().uuid(),
});

const simulateSchema = z.object({
  facilityId: z.string().uuid(),
});

const logsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export async function pullSync(req: Request, res: Response) {
  const { facilityConnectionId } = pullSchema.parse(req.body);
  const result = await syncService.pullSync(facilityConnectionId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "SYNC_TRIGGERED",
    resource: `FacilityConnection/${facilityConnectionId}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json(result);
}

export async function pushSync(req: Request, res: Response) {
  const { facilityConnectionId } = pushSchema.parse(req.body);
  const result = await syncService.pushSync(facilityConnectionId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "SYNC_TRIGGERED",
    resource: `FacilityConnection/${facilityConnectionId}/push`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json(result);
}

export async function simulateSync(req: Request, res: Response) {
  const { facilityId } = simulateSchema.parse(req.body);
  const result = await syncService.simulateSync(facilityId);
  res.status(StatusCodes.OK).json(result);
}

export async function getSyncLogs(req: Request, res: Response) {
  const { page, pageSize } = logsSchema.parse(req.query);
  const result = await syncService.getSyncLogs(req.user!.role, req.user!.facilityId, page, pageSize);
  res.status(StatusCodes.OK).json(result);
}

// POST /internal/auto-sync — called by cron, protected by CRON_SECRET middleware
export async function runAutoSync(_req: Request, res: Response) {
  const result = await syncService.runAutoSync();
  res.status(StatusCodes.OK).json(result);
}
