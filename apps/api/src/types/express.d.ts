import type { AppRole } from "@repo/types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: AppRole;
        facilityId: string | null;
        fullName: string;
      };
      correlationId?: string;
    }
  }
}

export {};
