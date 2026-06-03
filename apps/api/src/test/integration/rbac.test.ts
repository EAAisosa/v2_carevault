/**
 * Role-based access control integration tests.
 * Verifies that routes reject the wrong roles at the HTTP layer,
 * without needing a real DB or seeded data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../app";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    userRole: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../lib/email", () => ({
  passwordResetEmail: vi.fn(),
  userInviteEmail: vi.fn(),
}));

import { prisma } from "../../lib/prisma";

const app = createApp();

function makeToken(role: string, facilityId: string | null = null) {
  return jwt.sign(
    { sub: "user-1", role, facilityId },
    process.env["JWT_SECRET"] ?? "test-secret",
    { expiresIn: "1h" },
  );
}

function mockAuthenticatedUser(role: string, facilityId: string | null = null) {
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    fullName: "Test User",
    facilityId,
    isActive: true,
    passwordHash: "",
    lastSignIn: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
  vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ role } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["JWT_SECRET"] = "test-secret";
  process.env["JWT_REFRESH_SECRET"] = "test-refresh-secret";
  process.env["ENCRYPTION_KEY"] = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  process.env["CRON_SECRET"] = "test-cron-secret";
  process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";
  process.env["APP_URL"] = "http://localhost:3000";
});

describe("Route access control", () => {
  describe("GET /api/v1/facilities — carevault_admin only", () => {
    it("returns 401 with no token", async () => {
      const res = await request(app).get("/api/v1/facilities");
      expect(res.status).toBe(401);
    });

    it("returns 403 when clinician tries to access", async () => {
      mockAuthenticatedUser("clinician", "fac-1");
      const res = await request(app)
        .get("/api/v1/facilities")
        .set("Authorization", `Bearer ${makeToken("clinician", "fac-1")}`);
      expect(res.status).toBe(403);
    });

    it("returns 403 when facility_admin tries to access", async () => {
      mockAuthenticatedUser("facility_admin", "fac-1");
      const res = await request(app)
        .get("/api/v1/facilities")
        .set("Authorization", `Bearer ${makeToken("facility_admin", "fac-1")}`);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/audit-logs — carevault_admin only", () => {
    it("returns 401 with no token", async () => {
      const res = await request(app).get("/api/v1/audit-logs");
      expect(res.status).toBe(401);
    });

    it("returns 403 for clinician", async () => {
      mockAuthenticatedUser("clinician", "fac-1");
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${makeToken("clinician", "fac-1")}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/sync/pull — facility_admin and above", () => {
    it("returns 403 for clinician", async () => {
      mockAuthenticatedUser("clinician", "fac-1");
      const res = await request(app)
        .post("/api/v1/sync/pull")
        .set("Authorization", `Bearer ${makeToken("clinician", "fac-1")}`)
        .send({ facilityConnectionId: "00000000-0000-0000-0000-000000000001" });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/sync/internal/auto-sync — cron secret protected", () => {
    it("returns 403 without cron secret", async () => {
      const res = await request(app).post("/api/v1/sync/internal/auto-sync");
      expect(res.status).toBe(403);
    });

    it("returns 403 with wrong cron secret", async () => {
      const res = await request(app)
        .post("/api/v1/sync/internal/auto-sync")
        .set("x-cron-secret", "wrong-secret");
      expect(res.status).toBe(403);
    });
  });
});

describe("Input validation", () => {
  it("POST /api/v1/auth/reset-password rejects missing fields", async () => {
    const res = await request(app).post("/api/v1/auth/reset-password").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/auth/reset-password rejects short password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "some-token", newPassword: "short" });
    expect(res.status).toBe(400);
  });
});
