import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as patientsService from "../services/patients.service";
import * as auditLogsService from "../services/auditLogs.service";

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export async function searchPatients(req: Request, res: Response) {
  const { q, page, pageSize } = searchSchema.parse(req.query);
  const result = await patientsService.searchPatients({
    query: q,
    page,
    pageSize,
    role: req.user!.role,
    facilityId: req.user!.facilityId,
  });

  // Audit log every search
  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "PATIENT_SEARCH",
    resource: `PatientSearch?q=${q ?? ""}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json(result);
}

export async function getPatient(req: Request, res: Response) {
  const { id } = req.params;
  const result = await patientsService.getPatientById(id!, req.user!.role, req.user!.facilityId);

  await auditLogsService.createAuditLog({
    userId: req.user!.id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: "RECORD_VIEW",
    resource: `Patient/${id}`,
    facilityId: req.user!.facilityId,
    ipAddress: req.ip,
  });

  res.status(StatusCodes.OK).json(result);
}
