import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import type { AppRole } from "@repo/types";

interface JWTPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  let claims: JWTPayload;
  try {
    claims = jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired token" });
    return;
  }

  const [userRole, profile] = await Promise.all([
    prisma.userRole.findUnique({ where: { userId: claims.sub } }),
    prisma.profile.findUnique({ where: { id: claims.sub } }),
  ]);

  if (!profile?.isActive) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Account is inactive" });
    return;
  }

  req.user = {
    id: claims.sub,
    email: claims.email,
    role: (userRole?.role ?? "clinician") as AppRole,
    facilityId: profile?.facilityId ?? null,
    fullName: profile?.fullName ?? "",
  };

  next();
}
