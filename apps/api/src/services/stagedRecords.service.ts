import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import type { AppRole } from "@repo/types";

interface ListParams {
  status?: string;
  priority?: string;
  facilityId?: string;
  page?: number;
  pageSize?: number;
  role: AppRole;
  callerFacilityId: string | null;
}

export async function listStagedRecords({
  status,
  priority,
  facilityId,
  page = 1,
  pageSize = 20,
  role,
  callerFacilityId,
}: ListParams) {
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};

  if (status) where["status"] = status;
  if (priority) where["priority"] = priority;
  if (facilityId) where["sourceFacilityId"] = facilityId;

  // Facility admins and clinicians scoped to their facility
  if (role === "facility_admin" || role === "clinician") {
    if (!callerFacilityId) return { data: [], total: 0, page, pageSize, totalPages: 0 };
    where["sourceFacilityId"] = callerFacilityId;
  }

  if (role === "researcher") {
    throw new AppError("Researchers do not have access to staged records", StatusCodes.FORBIDDEN);
  }

  const [data, total] = await Promise.all([
    prisma.stagedRecord.findMany({
      where,
      orderBy: [{ priority: "desc" }, { submittedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.stagedRecord.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function updateStagedRecordStatus(
  id: string,
  newStatus: "approved" | "rejected" | "needs-review",
  adminNotes: string | null,
  role: AppRole,
  callerFacilityId: string | null
) {
  const record = await prisma.stagedRecord.findUnique({ where: { id } });
  if (!record) throw new AppError("Staged record not found", StatusCodes.NOT_FOUND);

  if (role === "facility_admin" && record.sourceFacilityId !== callerFacilityId) {
    throw new AppError("Cannot modify records from other facilities", StatusCodes.FORBIDDEN);
  }

  return prisma.stagedRecord.update({
    where: { id },
    data: { status: newStatus, adminNotes, updatedAt: new Date() },
  });
}

export async function flagStagedRecord(id: string, role: AppRole, callerFacilityId: string | null) {
  const record = await prisma.stagedRecord.findUnique({ where: { id } });
  if (!record) throw new AppError("Staged record not found", StatusCodes.NOT_FOUND);

  if (role === "facility_admin" && record.sourceFacilityId !== callerFacilityId) {
    throw new AppError("Cannot modify records from other facilities", StatusCodes.FORBIDDEN);
  }

  return prisma.stagedRecord.update({
    where: { id },
    data: { flagged: !record.flagged, updatedAt: new Date() },
  });
}
