import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma singleton BEFORE importing the service.
vi.mock("../lib/prisma", () => {
  const prisma = {
    patient: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    encounter: { findMany: vi.fn().mockResolvedValue([]) },
    vitalRecord: { findMany: vi.fn().mockResolvedValue([]) },
    medication: { findMany: vi.fn().mockResolvedValue([]) },
    allergy: { findMany: vi.fn().mockResolvedValue([]) },
    labResult: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma };
});

import { prisma } from "../lib/prisma";
import { getPatientById } from "./patients.service";

const FAC_A = "facility-a-uuid";
const FAC_B = "facility-b-uuid";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPatientById — facility scoping", () => {
  it("returns the patient for clinician at the same facility", async () => {
    (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1", facilityId: FAC_A, firstName: "A", lastName: "B",
    });
    const result = await getPatientById("p1", "clinician", FAC_A);
    expect(result.patient.id).toBe("p1");
  });

  it("hides cross-facility patients from a clinician (404)", async () => {
    (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1", facilityId: FAC_B,
    });
    await expect(getPatientById("p1", "clinician", FAC_A)).rejects.toThrowError("Patient not found");
  });

  it("hides cross-facility patients from a facility_admin (404) — fixes tenant leak", async () => {
    (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1", facilityId: FAC_B,
    });
    await expect(getPatientById("p1", "facility_admin", FAC_A)).rejects.toThrowError("Patient not found");
  });

  it("allows carevault_admin to read any facility's patient", async () => {
    (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1", facilityId: FAC_B,
    });
    const result = await getPatientById("p1", "carevault_admin", FAC_A);
    expect(result.patient.id).toBe("p1");
  });
});
