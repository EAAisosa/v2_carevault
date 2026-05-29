import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as connectionsService from "../services/facilityConnections.service";
import * as auditLogsService from "../services/auditLogs.service";

const createSchema = z.object({
  facilityId: z.string().uuid(),
  ehrType: z.string().min(1),
  baseUrl: z.string().url(),
  authType: z.enum(["basic", "oauth2", "api_key"]),
  authCredentials: z.record(z.unknown()),
  fhirVersion: z.string().optional(),
  syncDirection: z.string().optional(),
  syncIntervalMinutes: z.number().int().positive().default(60),
});

const updateSchema = z.object({
  baseUrl: z.string().url().optional(),
  authCredentials: z.record(z.unknown()).optional(),
  syncIntervalMinutes: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function listConnections(req: Request, res: Response) {
  const result = await connectionsService.listConnections(req.user!.role, req.user!.facilityId);
  res.status(StatusCodes.OK).json(result);
}

export async function createConnection(req: Request, res: Response) {
  const data = createSchema.parse(req.body);
  const result = await connectionsService.createConnection(data, req.user!.role, req.user!.facilityId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "FACILITY_CONNECTION_CREATE",
    resource: `FacilityConnection/${result.id}`,
    facilityId: req.user!.facilityId,
    metadata: { facilityId: data.facilityId, ehrType: data.ehrType },
    ipAddress: req.ip,
  });

  res.status(StatusCodes.CREATED).json(result);
}

export async function updateConnection(req: Request, res: Response) {
  const { id } = req.params;
  const data = updateSchema.parse(req.body);
  const result = await connectionsService.updateConnection(id!, data, req.user!.role, req.user!.facilityId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "FACILITY_CONNECTION_UPDATE",
    resource: `FacilityConnection/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json(result);
}

export async function deleteConnection(req: Request, res: Response) {
  const { id } = req.params;
  await connectionsService.deleteConnection(id!, req.user!.role, req.user!.facilityId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "FACILITY_CONNECTION_DELETE",
    resource: `FacilityConnection/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });

  res.status(StatusCodes.NO_CONTENT).send();
}

export async function testConnection(req: Request, res: Response) {
  const { id } = req.params;
  const result = await connectionsService.testConnection(id!, req.user!.role, req.user!.facilityId);
  res.status(StatusCodes.OK).json(result);
}
