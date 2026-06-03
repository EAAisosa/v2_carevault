/**
 * Role-based access control integration tests.
 * Verifies that routes reject the wrong roles at the HTTP layer,
 * without needing a real DB or JWT signature verification.
 *
 * The authenticate middleware is mocked to decode the token without verifying
 * the signature — these tests focus purely on requireRole behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { AppRole } from "@repo/types";
import { createApp } from "../../app";

// Bypass JWT signature verification and DB lookups.
// Attaches user directly from the decoded (unverified) token claims.
vi.mock("../../middleware/authenticate", () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers["authorization"] as string | undefined;
    if (!auth?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const decoded = jwt.decode(auth.slice(7)) as {
        sub: string;
        role: string;
        facilityId: string | null;
      } | null;
      if (!decoded) throw new Error("bad token");
      (req as Request & { user: unknown }).user = {
        id: decoded.sub,
        email: "test@example.com",
        role: decoded.role as AppRole,
        facilityId: decoded.facilityId,
        fullName: "Test User",
      };
      next();
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  },
}));

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

const app = createApp();

// Tokens are decoded without signature verification in the mocked middleware.
// Any secret works here — we just need a valid JWT structure.
function makeToken(role: string, facilityId: string | null = null) {
  return jwt.sign({ sub: "user-1", role, facilityId }, "test-secret", { expiresIn: "1h" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Route access control", () => {
  describe("GET /api/v1/facilities — requireAnyAdmin (facility_admin+)", () => {
    it("returns 401 with no token", async () => {
      const res = await request(app).get("/api/v1/facilities");
      expect(res.status).toBe(401);
    });

    it("returns 403 when clinician tries to access", async () => {
      const res = await request(app)
        .get("/api/v1/facilities")
        .set("Authorization", `Bearer ${makeToken("clinician", "fac-1")}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/facilities — requireSuperAdmin (carevault_admin only)", () => {
    it("returns 403 when facility_admin tries to create a facility", async () => {
      const res = await request(app)
        .post("/api/v1/facilities")
        .set("Authorization", `Bearer ${makeToken("facility_admin", "fac-1")}`)
        .send({ name: "Test", location: "Lagos", state: "Lagos", ehrSystem: "OpenMRS" });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/audit-logs — carevault_admin only", () => {
    it("returns 401 with no token", async () => {
      const res = await request(app).get("/api/v1/audit-logs");
      expect(res.status).toBe(401);
    });

    it("returns 403 for clinician", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${makeToken("clinician", "fac-1")}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/sync/pull — facility_admin and above", () => {
    it("returns 403 for clinician", async () => {
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
