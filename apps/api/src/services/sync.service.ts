import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import { mapFHIRBundle, pullFromEHR } from "@repo/fhir";
import type { AppRole } from "@repo/types";

interface DecryptedCredentials {
  get_decrypted_ehr_credentials: string | null;
}

async function getDecryptedCredentials(connectionId: string): Promise<Record<string, unknown>> {
  const rows = await prisma.$queryRaw<[DecryptedCredentials]>`
    SELECT get_decrypted_ehr_credentials(${connectionId}::uuid)
  `;
  const raw = rows[0]?.get_decrypted_ehr_credentials;
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export async function pullSync(connectionId: string) {
  const conn = await prisma.facilityConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new AppError("Connection not found", StatusCodes.NOT_FOUND);
  if (!conn.isActive) throw new AppError("Connection is not active", StatusCodes.BAD_REQUEST);

  const syncLog = await prisma.syncLog.create({
    data: {
      facilityConnectionId: conn.id,
      facilityId: conn.facilityId,
      direction: "inbound",
      status: "in_progress",
    },
  });

  try {
    const creds = await getDecryptedCredentials(conn.id);
    const bundle = await pullFromEHR(
      {
        baseUrl: conn.baseUrl,
        authType: conn.authType as "basic" | "oauth2" | "api_key",
        authCredentials: creds,
        fhirVersion: conn.fhirVersion,
      },
      "Patient?_revinclude=*&_count=50"
    );

    const normalised = mapFHIRBundle(bundle);
    const facility = await prisma.facility.findUnique({
      where: { id: conn.facilityId },
      select: { name: true },
    });

    if (normalised.length > 0) {
      await prisma.stagedRecord.createMany({
        data: normalised.map((r) => ({
          patientName: r.patientName,
          nin: r.nin,
          sourceFacilityId: conn.facilityId,
          sourceFacilityName: facility?.name ?? "Unknown Facility",
          dataType: r.dataType,
          summary: r.summary,
          practitioner: r.practitioner,
          fhirResourceType: r.fhirResourceType,
          fhirPayload: r.fhirPayload as Prisma.InputJsonValue,
          priority: r.priority,
          status: r.status,
          conflictType: r.conflictType,
          submittedAt: new Date(),
        })),
      });
    }

    await Promise.all([
      prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "completed",
          recordsProcessed: normalised.length,
          completedAt: new Date(),
        },
      }),
      prisma.facilityConnection.update({
        where: { id: conn.id },
        data: { lastSuccessfulSync: new Date() },
      }),
      prisma.facility.update({
        where: { id: conn.facilityId },
        data: { lastSync: new Date() },
      }),
    ]);

    return { ok: true, recordsSynced: normalised.length, syncLogId: syncLog.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: message,
        nextRetryAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    throw new AppError(`Sync failed: ${message}`, StatusCodes.BAD_GATEWAY);
  }
}

export async function runAutoSync() {
  const dueConns = await prisma.facilityConnection.findMany({
    where: { isActive: true },
  });

  const now = Date.now();
  const due = dueConns.filter((conn) => {
    if (!conn.lastSuccessfulSync) return true;
    const next = conn.lastSuccessfulSync.getTime() + conn.syncIntervalMinutes * 60_000;
    return now >= next;
  });

  const results: { connectionId: string; status: string; records?: number; error?: string }[] = [];

  for (const conn of due) {
    try {
      const result = await pullSync(conn.id);
      results.push({ connectionId: conn.id, status: "synced", records: result.recordsSynced });
    } catch (err: unknown) {
      results.push({
        connectionId: conn.id,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ranAt: new Date().toISOString(), due: due.length, results };
}

export async function getSyncLogs(
  role: AppRole,
  callerFacilityId: string | null,
  page = 1,
  pageSize = 20
) {
  const skip = (page - 1) * pageSize;
  const where =
    role === "facility_admin" && callerFacilityId ? { facilityId: callerFacilityId } : {};

  const [data, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.syncLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function simulateSync(facilityId: string) {
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) throw new AppError("Facility not found", StatusCodes.NOT_FOUND);

  // Generate a synthetic FHIR bundle for demo purposes
  const syntheticRecords = [
    {
      patientName: "Kolade Ogunleye",
      nin: `NG-SIM-${Date.now()}`,
      dataType: "Encounter + Diagnosis",
      summary: "Simulated encounter: Hypertension follow-up",
      practitioner: "Dr. Simulated",
      fhirResourceType: "Encounter",
      fhirPayload: { resourceType: "Encounter", status: "finished", class: { code: "outpatient" } },
      priority: "medium" as const,
      status: "pending" as const,
      conflictType: null,
      sourceFacilityId: facilityId,
      sourceFacilityName: facility.name,
      submittedAt: new Date(),
    },
  ];

  await prisma.stagedRecord.createMany({ data: syntheticRecords });
  return { ok: true, message: `Simulated 1 record for ${facility.name}` };
}
