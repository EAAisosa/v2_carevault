import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import type { AppRole } from "@repo/types";
import { pullFromEHR } from "@repo/fhir";
import { encryptJSON, decryptJSON } from "../lib/crypto";

// Public projection — never includes the ciphertext column.
const SAFE_SELECT = {
  id: true,
  facilityId: true,
  ehrType: true,
  baseUrl: true,
  authType: true,
  fhirVersion: true,
  syncDirection: true,
  syncIntervalMinutes: true,
  isActive: true,
  lastSuccessfulSync: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listConnections(role: AppRole, callerFacilityId: string | null) {
  const where = role === "facility_admin" && callerFacilityId
    ? { facilityId: callerFacilityId }
    : {};
  return prisma.facilityConnection.findMany({
    where,
    select: SAFE_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export async function createConnection(
  data: {
    facilityId: string;
    ehrType: string;
    baseUrl: string;
    authType: string;
    authCredentials: Record<string, unknown>;
    fhirVersion?: string;
    syncDirection?: string;
    syncIntervalMinutes?: number;
  },
  role: AppRole,
  callerFacilityId: string | null
) {
  if (role === "facility_admin" && data.facilityId !== callerFacilityId) {
    throw new AppError("Cannot create connections for other facilities", StatusCodes.FORBIDDEN);
  }

  return prisma.facilityConnection.create({
    data: {
      facilityId: data.facilityId,
      ehrType: data.ehrType,
      baseUrl: data.baseUrl,
      authType: data.authType,
      authCredentials: encryptJSON(data.authCredentials),
      fhirVersion: data.fhirVersion ?? "R4",
      syncDirection: data.syncDirection ?? "pull",
      syncIntervalMinutes: data.syncIntervalMinutes ?? 60,
    },
    select: SAFE_SELECT,
  });
}

export async function updateConnection(
  id: string,
  data: Partial<{
    baseUrl: string;
    authCredentials: Record<string, unknown>;
    syncIntervalMinutes: number;
    isActive: boolean;
  }>,
  role: AppRole,
  callerFacilityId: string | null
) {
  const conn = await prisma.facilityConnection.findUnique({ where: { id } });
  if (!conn) throw new AppError("Connection not found", StatusCodes.NOT_FOUND);

  if (role === "facility_admin" && conn.facilityId !== callerFacilityId) {
    throw new AppError("Cannot modify connections for other facilities", StatusCodes.FORBIDDEN);
  }

  return prisma.facilityConnection.update({
    where: { id },
    data: {
      ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
      ...(data.authCredentials !== undefined && {
        authCredentials: encryptJSON(data.authCredentials),
      }),
      ...(data.syncIntervalMinutes !== undefined && { syncIntervalMinutes: data.syncIntervalMinutes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: SAFE_SELECT,
  });
}

export async function deleteConnection(
  id: string,
  role: AppRole,
  callerFacilityId: string | null
) {
  const conn = await prisma.facilityConnection.findUnique({ where: { id } });
  if (!conn) throw new AppError("Connection not found", StatusCodes.NOT_FOUND);

  if (role === "facility_admin" && conn.facilityId !== callerFacilityId) {
    throw new AppError("Cannot delete connections for other facilities", StatusCodes.FORBIDDEN);
  }

  await prisma.facilityConnection.delete({ where: { id } });
}

// Fetch a connection along with its decrypted credentials. Internal-only —
// never expose the returned object directly to the API caller.
export async function getConnectionWithCredentials(id: string) {
  const conn = await prisma.facilityConnection.findUnique({ where: { id } });
  if (!conn) throw new AppError("Connection not found", StatusCodes.NOT_FOUND);
  const creds = decryptJSON<Record<string, unknown>>(conn.authCredentials);
  return { conn, creds };
}

export async function testConnection(
  id: string,
  role: AppRole,
  callerFacilityId: string | null
) {
  const { conn, creds } = await getConnectionWithCredentials(id);

  if (role === "facility_admin" && conn.facilityId !== callerFacilityId) {
    throw new AppError("Connection not found", StatusCodes.NOT_FOUND);
  }

  try {
    await pullFromEHR(
      {
        baseUrl: conn.baseUrl,
        authType: conn.authType as "basic" | "oauth2" | "api_key",
        authCredentials: creds,
        fhirVersion: conn.fhirVersion,
      },
      "metadata"
    );
    return { ok: true, message: "Connection successful" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(`Connection test failed: ${message}`, StatusCodes.BAD_GATEWAY);
  }
}
