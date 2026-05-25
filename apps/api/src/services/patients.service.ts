import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import type { AppRole } from "@repo/types";

export interface PatientSearchParams {
  query?: string;
  page?: number;
  pageSize?: number;
  role: AppRole;
  facilityId: string | null;
}

export async function searchPatients({ query, page = 1, pageSize = 20, role, facilityId }: PatientSearchParams) {
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  // Clinicians only see their own facility's patients
  if (role === "clinician") {
    if (!facilityId) return { data: [], total: 0, page, pageSize, totalPages: 0 };
    where["facilityId"] = facilityId;
  }

  // Facility admins only see their facility
  if (role === "facility_admin" && facilityId) {
    where["facilityId"] = facilityId;
  }

  // Researchers see nothing via this endpoint — they use the de-identified route
  if (role === "researcher") {
    throw new AppError("Researchers must use the research data access endpoints", StatusCodes.FORBIDDEN);
  }

  if (query) {
    const isMaybeNin = query.replace(/\s/g, "").length > 6;
    where["OR"] = [
      { nin: { contains: query, mode: "insensitive" } },
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      ...(isMaybeNin ? [{ nin: { startsWith: query.toUpperCase() } }] : []),
    ];
  }

  const [data, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: { facility: { select: { id: true, name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPatientById(id: string, role: AppRole, facilityId: string | null) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { facility: { select: { id: true, name: true } } },
  });

  if (!patient) throw new AppError("Patient not found", StatusCodes.NOT_FOUND);

  // Clinicians restricted to their facility
  if (role === "clinician" && patient.facilityId !== facilityId) {
    throw new AppError("Patient not found", StatusCodes.NOT_FOUND);
  }

  const [encounters, vitalRecords, medications, allergies, labResults] = await Promise.all([
    prisma.encounter.findMany({
      where: { patientId: id },
      orderBy: { encounterDate: "desc" },
    }),
    prisma.vitalRecord.findMany({
      where: { patientId: id },
      orderBy: { recordedDate: "desc" },
    }),
    prisma.medication.findMany({
      where: { patientId: id },
      orderBy: { startDate: "desc" },
    }),
    prisma.allergy.findMany({
      where: { patientId: id },
      orderBy: { dateRecorded: "desc" },
    }),
    prisma.labResult.findMany({
      where: { patientId: id },
      orderBy: { resultDate: "desc" },
    }),
  ]);

  return { patient, encounters, vitalRecords, medications, allergies, labResults };
}
