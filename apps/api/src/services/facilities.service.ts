import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import type { AppRole, FacilityStatus } from "@repo/types";

export async function listFacilities(role: AppRole, facilityId: string | null) {
  if (role === "facility_admin") {
    if (!facilityId) return [];
    return prisma.facility.findMany({ where: { id: facilityId } });
  }
  return prisma.facility.findMany({ orderBy: { name: "asc" } });
}

export async function getFacilityById(id: string) {
  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) throw new AppError("Facility not found", StatusCodes.NOT_FOUND);
  return facility;
}

export async function createFacility(data: {
  name: string;
  location: string;
  state: string;
  facilityCode?: string;
  ehrSystem?: string;
}) {
  return prisma.facility.create({ data });
}

export async function updateFacility(
  id: string,
  data: Partial<{ name: string; location: string; state: string; ehrSystem: string }>
) {
  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) throw new AppError("Facility not found", StatusCodes.NOT_FOUND);
  return prisma.facility.update({ where: { id }, data });
}

export async function updateFacilityStatus(id: string, status: FacilityStatus) {
  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) throw new AppError("Facility not found", StatusCodes.NOT_FOUND);
  return prisma.facility.update({ where: { id }, data: { status } });
}
