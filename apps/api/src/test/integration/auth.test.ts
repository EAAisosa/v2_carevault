import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app";

// Mock all infrastructure dependencies so the HTTP layer is testable without a real DB or SES.
vi.mock("../../lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn(), update: vi.fn() },
    userRole: { findFirst: vi.fn() },
    refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    passwordResetToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

vi.mock("../../lib/email", () => ({
  passwordResetEmail: vi.fn().mockResolvedValue(undefined),
  userInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/auth/login", () => {
  it("returns 400 when body is missing", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 for unknown email", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "unknown@example.com", password: "Password123!" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: "user-1",
      email: "admin@carevault.ng",
      passwordHash: await bcrypt.hash("correct-password", 1),
      fullName: "Test Admin",
      facilityId: null,
      isActive: true,
      lastSignIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@carevault.ng", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("returns 200 with accessToken for valid credentials", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: "user-1",
      email: "admin@carevault.ng",
      passwordHash: hash,
      fullName: "Test Admin",
      facilityId: null,
      isActive: true,
      lastSignIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ role: "carevault_admin" } as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({ token: "refresh-token-123" } as never);
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@carevault.ng", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user.email).toBe("admin@carevault.ng");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns 401 without Authorization header", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-valid-jwt");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  it("always returns 200 regardless of whether email exists (no enumeration)", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nonexistent@example.com" });
    expect(res.status).toBe(200);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("returns 401 without a valid access token (logout requires auth)", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("returns 200 with db:ok when DB is reachable", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("ok");
  });

  it("returns 503 when DB is unreachable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("connection refused"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
  });
});
