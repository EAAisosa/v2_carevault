import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as facilitiesService from "../services/facilities.service";
import * as auditLogsService from "../services/auditLogs.service";

const createSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  state: z.string().min(1),
  facilityCode: z.string().optional(),
  ehrSystem: z.string().optional(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum(["online", "degraded", "offline"]),
});

export async function listFacilities(req: Request, res: Response) {
  const result = await facilitiesService.listFacilities(req.user!.role, req.user!.facilityId);
  res.status(StatusCodes.OK).json(result);
}

export async function createFacility(req: Request, res: Response) {
  const data = createSchema.parse(req.body);
  const result = await facilitiesService.createFacility(data);
  res.status(StatusCodes.CREATED).json(result);
}

export async function updateFacility(req: Request, res: Response) {
  const data = updateSchema.parse(req.body);
  const result = await facilitiesService.updateFacility(req.params["id"]!, data);
  res.status(StatusCodes.OK).json(result);
}

export async function updateFacilityStatus(req: Request, res: Response) {
  const { status } = statusSchema.parse(req.body);
  const result = await facilitiesService.updateFacilityStatus(
    req.params["id"]!,
    status,
    req.user!.role,
    req.user!.facilityId
  );

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "FACILITY_STATUS_CHANGE",
    resource: `Facility/${req.params["id"]}`,
    facilityId: req.user!.facilityId,
    metadata: { newStatus: status },
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json(result);
}
