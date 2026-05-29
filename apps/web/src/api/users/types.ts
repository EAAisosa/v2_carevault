import type { UserProfile, AppRole } from "@repo/types";

export interface ManagedUser extends UserProfile {
  banned: boolean;
  confirmed: boolean;
  lastSignIn: string | null;
  createdAt: string;
  facilityName: string | null;
}

export interface InviteUserVars {
  email: string;
  fullName: string;
  role: AppRole;
  facilityId?: string;
}
