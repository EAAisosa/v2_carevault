/**
 * One-off production user seed.
 * Creates test accounts for all 4 roles + a test facility for scoped users.
 *
 * Run via ECS Exec:
 *   node /app/apps/api/scripts/seed-prod-users.js
 *
 * Safe to re-run — uses upsert so existing records are updated, not duplicated.
 */

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
});

const PASSWORD = "CareVault2026!";

async function main() {
  console.log("=== CareVault production user seed ===\n");

  // ── Test facility (needed for facility-scoped roles) ───────────────────────
  const facility = await prisma.facility.upsert({
    where: { facilityCode: "LUTH-001" },
    update: {},
    create: {
      name: "Lagos University Teaching Hospital",
      location: "Lagos Island",
      state: "Lagos",
      facilityCode: "LUTH-001",
      ehrSystem: "OpenMRS",
      status: "online",
    },
  });
  console.log(`Facility : ${facility.name} (${facility.id})\n`);

  const hash = await bcrypt.hash(PASSWORD, 12);

  const users = [
    {
      email: "admin@carevaultng.com",
      fullName: "CareVault Admin",
      role: "carevault_admin",
      facilityId: null,
    },
    {
      email: "fadmin@luth.ng",
      fullName: "Facility Admin — LUTH",
      role: "facility_admin",
      facilityId: facility.id,
    },
    {
      email: "clinician@luth.ng",
      fullName: "Dr. Test Clinician",
      role: "clinician",
      facilityId: facility.id,
    },
    {
      email: "researcher@carevaultng.com",
      fullName: "Test Researcher",
      role: "researcher",
      facilityId: null,
    },
  ];

  for (const u of users) {
    const profile = await prisma.profile.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, isActive: true, facilityId: u.facilityId },
      create: {
        email: u.email,
        fullName: u.fullName,
        facilityId: u.facilityId,
        passwordHash: hash,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId: profile.id },
      update: { role: u.role },
      create: { userId: profile.id, role: u.role },
    });

    console.log(`✓  ${u.role.padEnd(20)} ${u.email}`);
  }

  console.log(`\nPassword (all accounts): ${PASSWORD}`);
  console.log("\nRoles and access:");
  console.log("  carevault_admin   — full access, no facility scope");
  console.log("  facility_admin    — users, connections, staging for LUTH only");
  console.log("  clinician         — read patients for LUTH only");
  console.log("  researcher        — de-identified research access only");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
