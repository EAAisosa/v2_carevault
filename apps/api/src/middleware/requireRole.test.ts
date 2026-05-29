import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { requireRole, requireAnyAdmin, requireSuperAdmin } from "./requireRole";
import type { AppRole } from "@repo/types";

function makeReq(role?: AppRole): Request {
  return (role ? { user: { id: "u1", email: "u@x", role, facilityId: null, fullName: "" } } : {}) as Request;
}

function makeRes() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  return { status, json } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("requireRole", () => {
  it("401 when user is missing", () => {
    const res = makeRes() as ReturnType<typeof makeRes>;
    const next = vi.fn();
    requireRole("clinician")(makeReq(), res, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it("403 when role is not in allowlist", () => {
    const res = makeRes();
    const next = vi.fn();
    requireRole("carevault_admin")(makeReq("clinician"), res, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes through when role matches", () => {
    const res = makeRes();
    const next = vi.fn();
    requireRole("clinician", "carevault_admin")(makeReq("clinician"), res, next as NextFunction);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireAnyAdmin", () => {
  it.each(["clinician", "researcher"] as AppRole[])("rejects %s", (role) => {
    const res = makeRes();
    const next = vi.fn();
    requireAnyAdmin(makeReq(role), res, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });

  it.each(["facility_admin", "carevault_admin"] as AppRole[])("accepts %s", (role) => {
    const res = makeRes();
    const next = vi.fn();
    requireAnyAdmin(makeReq(role), res, next as NextFunction);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireSuperAdmin", () => {
  it("rejects facility_admin", () => {
    const res = makeRes();
    const next = vi.fn();
    requireSuperAdmin(makeReq("facility_admin"), res, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });

  it("accepts carevault_admin", () => {
    const res = makeRes();
    const next = vi.fn();
    requireSuperAdmin(makeReq("carevault_admin"), res, next as NextFunction);
    expect(next).toHaveBeenCalledOnce();
  });
});
