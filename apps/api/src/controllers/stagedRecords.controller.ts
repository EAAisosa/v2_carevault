import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as stagedService from "../services/stagedRecords.service";
import * as auditLogsService from "../services/auditLogs.service";

const listSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  facilityId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const statusUpdateSchema = z.object({
  adminNotes: z.string().optional(),
});

export async function listStagedRecords(req: Request, res: Response) {
  const { status, priority, facilityId, page, pageSize } = listSchema.parse(req.query);
  const result = await stagedService.listStagedRecords({
    status,
    priority,
    facilityId,
    page,
    pageSize,
    role: req.user!.role,
    callerFacilityId: req.user!.facilityId,
  });
  res.status(StatusCodes.OK).json(result);
}

async function auditStaging(req: Request, id: string, action: "STAGING_APPROVE" | "STAGING_REJECT" | "STAGING_FLAG" | "STAGING_NEEDS_REVIEW") {
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action,
    resource: `StagingRecord/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });
}

export async function approveRecord(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = statusUpdateSchema.parse(req.body);
  const result = await stagedService.updateStagedRecordStatus(
    id!, "approved", adminNotes ?? null, req.user!.role, req.user!.facilityId
  );
  await auditStaging(req, id!, "STAGING_APPROVE");
  res.status(StatusCodes.OK).json(result);
}

export async function rejectRecord(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = statusUpdateSchema.parse(req.body);
  const result = await stagedService.updateStagedRecordStatus(
    id!, "rejected", adminNotes ?? null, req.user!.role, req.user!.facilityId
  );
  await auditStaging(req, id!, "STAGING_REJECT");
  res.status(StatusCodes.OK).json(result);
}

export async function flagRecord(req: Request, res: Response) {
  const { id } = req.params;
  const result = await stagedService.flagStagedRecord(id!, req.user!.role, req.user!.facilityId);
  await auditStaging(req, id!, "STAGING_FLAG");
  res.status(StatusCodes.OK).json(result);
}

export async function needsReviewRecord(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = statusUpdateSchema.parse(req.body);
  const result = await stagedService.updateStagedRecordStatus(
    id!, "needs-review", adminNotes ?? null, req.user!.role, req.user!.facilityId
  );
  await auditStaging(req, id!, "STAGING_NEEDS_REVIEW");
  res.status(StatusCodes.OK).json(result);
}
