/**
 * Seed script for development.
 * Run: pnpm --filter @repo/db db:seed
 *
 * Creates:
 * - 2 facilities (Lagos University Teaching Hospital, Abuja National Hospital)
 * - 4 patients with full clinical records
 * - Facility connections for each facility
 *
 * NOTE: Auth users (clinician, admin, etc.) must be seeded via Supabase
 * dashboard or the seed-test-users Edge Function (supabase/functions/seed-test-users/).
 * Prisma cannot write to auth.users — that table is GoTrue-managed.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["query"] });

async function main() {
  console.log("🌱 Seeding CareVault database...");

  // ── Facilities ──────────────────────────────────────────────────────────
  const luth = await prisma.facility.upsert({
    where: { facilityCode: "LUTH-001" },
    update: {},
    create: {
      name: "Lagos University Teaching Hospital",
      location: "Idi-Araba, Lagos",
      state: "Lagos",
      facilityCode: "LUTH-001",
      ehrSystem: "OpenMRS",
      status: "online",
      uptime: 99.2,
      recordsCount: 0,
    },
  });

  const anh = await prisma.facility.upsert({
    where: { facilityCode: "ANH-001" },
    update: {},
    create: {
      name: "Abuja National Hospital",
      location: "Central Area, FCT",
      state: "FCT",
      facilityCode: "ANH-001",
      ehrSystem: "Bahmni",
      status: "online",
      uptime: 98.7,
      recordsCount: 0,
    },
  });

  console.log(`✅ Facilities: ${luth.name}, ${anh.name}`);

  // ── Facility Connections ────────────────────────────────────────────────
  await prisma.facilityConnection.upsert({
    where: { facilityId_ehrType: { facilityId: luth.id, ehrType: "OpenMRS" } },
    update: {},
    create: {
      facilityId: luth.id,
      ehrType: "OpenMRS",
      baseUrl: "https://demo.openmrs.org/openmrs/ws/fhir2/R4",
      authType: "basic",
      authCredentials: { username: "admin", password: "Admin123" },
      fhirVersion: "R4",
      syncDirection: "pull",
      syncIntervalMinutes: 180,
      isActive: true,
    },
  });

  await prisma.facilityConnection.upsert({
    where: { facilityId_ehrType: { facilityId: anh.id, ehrType: "Bahmni" } },
    update: {},
    create: {
      facilityId: anh.id,
      ehrType: "Bahmni",
      baseUrl: "https://demo.bahmni.org/openmrs/ws/fhir2/R4",
      authType: "basic",
      authCredentials: { username: "admin", password: "Admin123" },
      fhirVersion: "R4",
      syncDirection: "pull",
      syncIntervalMinutes: 180,
      isActive: true,
    },
  });

  console.log("✅ Facility connections created");

  // ── Patients ────────────────────────────────────────────────────────────
  const patients = [
    {
      nin: "NG-NIN-001-2000",
      firstName: "Adaeze",
      lastName: "Okonkwo",
      dateOfBirth: new Date("1988-03-15"),
      gender: "Female" as const,
      phone: "+2348012345678",
      bloodGroup: "O+",
      genotype: "AA",
      facilityId: luth.id,
      lga: "Oshodi-Isolo",
      state: "Lagos",
    },
    {
      nin: "NG-NIN-002-1975",
      firstName: "Emeka",
      lastName: "Nwosu",
      dateOfBirth: new Date("1975-07-22"),
      gender: "Male" as const,
      phone: "+2348023456789",
      bloodGroup: "A+",
      genotype: "AS",
      facilityId: luth.id,
      lga: "Ikeja",
      state: "Lagos",
    },
    {
      nin: "NG-NIN-003-1992",
      firstName: "Fatima",
      lastName: "Aliyu",
      dateOfBirth: new Date("1992-11-08"),
      gender: "Female" as const,
      phone: "+2348034567890",
      bloodGroup: "B+",
      genotype: "AA",
      facilityId: anh.id,
      lga: "Municipal",
      state: "FCT",
    },
    {
      nin: "NG-NIN-004-1965",
      firstName: "Babatunde",
      lastName: "Adeleke",
      dateOfBirth: new Date("1965-05-30"),
      gender: "Male" as const,
      phone: "+2348045678901",
      bloodGroup: "AB+",
      genotype: "AA",
      facilityId: anh.id,
      lga: "Gwagwalada",
      state: "FCT",
    },
  ];

  const createdPatients = [];
  for (const p of patients) {
    const patient = await prisma.patient.upsert({
      where: { nin: p.nin },
      update: {},
      create: p,
    });
    createdPatients.push(patient);
  }

  console.log(`✅ Patients: ${createdPatients.length} created`);

  // ── Clinical data for first patient ─────────────────────────────────────
  const adaeze = createdPatients[0]!;

  await prisma.encounter.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        practitioner: "Dr. Chioma Eze",
        encounterDate: new Date("2026-04-10"),
        type: "Outpatient",
        diagnosis: "Hypertension — controlled",
        notes: "BP well-managed on current medication",
        status: "completed",
      },
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        practitioner: "Dr. Femi Adeyemi",
        encounterDate: new Date("2026-02-20"),
        type: "Outpatient",
        diagnosis: "Type 2 Diabetes — follow-up",
        notes: "HbA1c stable at 6.8%",
        status: "completed",
      },
    ],
  });

  await prisma.vitalRecord.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        recordedDate: new Date("2026-04-10"),
        systolic: 128,
        diastolic: 82,
        heartRate: 74,
        temperature: 36.6,
        weight: 68.5,
        spo2: 99,
      },
    ],
  });

  await prisma.medication.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        name: "Amlodipine 5mg",
        dosage: "5mg",
        frequency: "Once daily",
        prescribedBy: "Dr. Chioma Eze",
        startDate: new Date("2025-10-01"),
        status: "active",
      },
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        name: "Metformin 500mg",
        dosage: "500mg",
        frequency: "Twice daily",
        prescribedBy: "Dr. Femi Adeyemi",
        startDate: new Date("2024-06-15"),
        status: "active",
      },
    ],
  });

  await prisma.allergy.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        substance: "Penicillin",
        reaction: "Anaphylaxis",
        severity: "severe",
        reportedBy: "Dr. Chioma Eze",
        dateRecorded: new Date("2023-03-01"),
      },
    ],
  });

  await prisma.labResult.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        test: "HbA1c",
        result: "6.8",
        unit: "%",
        referenceRange: "4.0 – 5.6",
        resultDate: new Date("2026-02-20"),
        status: "abnormal",
      },
      {
        patientId: adaeze.id,
        facilityId: luth.id,
        facilityName: "Lagos University Teaching Hospital",
        test: "Fasting Blood Glucose",
        result: "5.9",
        unit: "mmol/L",
        referenceRange: "3.9 – 5.6",
        resultDate: new Date("2026-02-20"),
        status: "abnormal",
      },
    ],
  });

  console.log("✅ Clinical records for Adaeze Okonkwo created");

  // ── Update facility record counts ────────────────────────────────────────
  await prisma.facility.update({
    where: { id: luth.id },
    data: { recordsCount: 2 },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
