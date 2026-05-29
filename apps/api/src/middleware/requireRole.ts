import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import type { AppRole } from "@repo/types";

export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export function requireAnyAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    return;
  }
  if (req.user.role !== "carevault_admin" && req.user.role !== "facility_admin") {
    res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    return;
  }
  if (req.user.role !== "carevault_admin") {
    res.status(StatusCodes.FORBIDDEN).json({ error: "CareVault Admin access required" });
    return;
  }
  next();
}
