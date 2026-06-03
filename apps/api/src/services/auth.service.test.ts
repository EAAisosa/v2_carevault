import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/email", () => ({
  passwordResetEmail: vi.fn().mockResolvedValue(undefined),
  userInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { prisma } from "../lib/prisma";
import { refreshSession, forgotPassword } from "./auth.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshSession", () => {
  it("rejects expired tokens", async () => {
    (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rt1", userId: "u1", revokedAt: null, expiresAt: new Date(Date.now() - 1000),
    });
    await expect(refreshSession("tok")).rejects.toThrowError("Invalid or expired refresh token");
  });

  it("revokes the user's entire chain when a revoked token is replayed (theft signal)", async () => {
    (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rt1",
      userId: "u1",
      revokedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(refreshSession("tok")).rejects.toThrowError("Refresh token reuse detected");
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("forgotPassword", () => {
  it("silently returns when the email is unknown (no enumeration)", async () => {
    (prisma.profile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(forgotPassword("unknown@x.com")).resolves.toBeUndefined();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("invalidates prior unused reset tokens before issuing a new one", async () => {
    (prisma.profile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1", email: "a@x.com" });
    await forgotPassword("a@x.com");

    // The transaction should include updateMany THEN create — both fired.
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
  });
});
