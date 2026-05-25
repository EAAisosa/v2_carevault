import { prisma } from "../lib/prisma";
import type { AppRole } from "@repo/types";

export async function getDashboardStats(role: AppRole, facilityId: string | null) {
  const facilityWhere = role === "facility_admin" && facilityId ? { id: facilityId } : {};
  const patientWhere =
    role === "facility_admin" && facilityId ? { facilityId } : {};
  const stagedWhere =
    role === "facility_admin" && facilityId ? { sourceFacilityId: facilityId } : {};
  const userWhere =
    role === "facility_admin" && facilityId ? { facilityId } : {};

  const [
    totalPatients,
    totalFacilities,
    pendingStagedRecords,
    totalUsers,
    facilityCounts,
    recentSyncLogs,
  ] = await Promise.all([
    prisma.patient.count({ where: patientWhere }),
    prisma.facility.count({ where: facilityWhere }),
    prisma.stagedRecord.count({ where: { ...stagedWhere, status: "pending" } }),
    prisma.profile.count({ where: userWhere }),
    prisma.facility.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.syncLog.findMany({
      where: role === "facility_admin" && facilityId ? { facilityId } : {},
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const facilityStatuses = { online: 0, degraded: 0, offline: 0 };
  for (const row of facilityCounts) {
    const key = row.status as keyof typeof facilityStatuses;
    if (key in facilityStatuses) facilityStatuses[key] = row._count.status;
  }

  return {
    totalPatients,
    totalFacilities,
    pendingStagedRecords,
    totalUsers,
    facilityStatuses,
    recentSyncLogs,
  };
}
