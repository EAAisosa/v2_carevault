import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as auditLogsService from "../services/auditLogs.service";

const listSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  facilityId: z.string().uuid().optional(),
  resource: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export async function listAuditLogs(req: Request, res: Response) {
  const filters = listSchema.parse(req.query);
  // facility_admin can only see their own facility's logs
  const facilityId =
    req.user!.role === "facility_admin"
      ? (req.user!.facilityId ?? undefined)
      : filters.facilityId;
  const result = await auditLogsService.listAuditLogs({ ...filters, facilityId });
  res.status(StatusCodes.OK).json(result);
}
