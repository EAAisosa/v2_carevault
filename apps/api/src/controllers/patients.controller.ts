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
  // Accept either query (legacy GET) or body (POST /search) so PII can stay
  // out of the URL.
  const source = req.method === "POST" ? req.body : req.query;
  const { q, page, pageSize } = searchSchema.parse(source ?? {});

  let outcome: "success" | "error" = "success";
  try {
    const result = await patientsService.searchPatients({
      query: q,
      page,
      pageSize,
      role: req.user!.role,
      facilityId: req.user!.facilityId,
    });
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    outcome = "error";
    throw err;
  } finally {
    // NDPA: log attempted access regardless of outcome
    await auditLogsService.createAuditLog({
      userId: req.user!.id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: "PATIENT_SEARCH",
      resource: `PatientSearch?q=${q ?? ""}`,
      facilityId: req.user!.facilityId,
      ipAddress: req.ip,
      metadata: { outcome },
    });
  }
}

export async function getPatient(req: Request, res: Response) {
  const { id } = req.params;

  let outcome: "success" | "error" = "success";
  try {
    const result = await patientsService.getPatientById(id!, req.user!.role, req.user!.facilityId);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    outcome = "error";
    throw err;
  } finally {
    await auditLogsService.createAuditLog({
      userId: req.user!.id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: "RECORD_VIEW",
      resource: `Patient/${id}`,
      facilityId: req.user!.facilityId,
      ipAddress: req.ip,
      metadata: { outcome },
    });
  }
}
