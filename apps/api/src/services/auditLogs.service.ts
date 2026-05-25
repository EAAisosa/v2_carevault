import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import type { AuditAction } from "@repo/types";

interface ListParams {
  userId?: string;
  action?: string;
  facilityId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(params: ListParams) {
  const { userId, action, facilityId, dateFrom, dateTo, page = 1, pageSize = 50 } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (userId) where["userId"] = userId;
  if (action) where["action"] = action;
  if (facilityId) where["facilityId"] = facilityId;
  if (dateFrom || dateTo) {
    where["createdAt"] = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createAuditLog(data: {
  userId: string;
  userName: string;
  role: string;
  action: AuditAction;
  resource: string;
  facilityId?: string | null;
  facilityName?: string;
  ipAddress?: string;
  status?: "success" | "failure" | "warning";
  metadata?: Record<string, unknown> | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      userName: data.userName,
      role: data.role,
      action: data.action,
      resource: data.resource,
      facilityId: data.facilityId ?? null,
      facilityName: data.facilityName ?? "",
      ipAddress: data.ipAddress ?? "—",
      status: data.status ?? "success",
      metadata: data.metadata != null ? (data.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
}
