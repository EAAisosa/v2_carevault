import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dashboardService from "../services/dashboard.service";

export async function getDashboardStats(req: Request, res: Response) {
  const result = await dashboardService.getDashboardStats(req.user!.role, req.user!.facilityId);
  res.status(StatusCodes.OK).json(result);
}
