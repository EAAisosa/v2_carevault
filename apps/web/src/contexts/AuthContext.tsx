"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createApiClient } from "@/lib/api-client";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import InactivityWarningModal from "@/components/InactivityWarningModal";
import type { AppRole } from "@repo/types";

// Auth state lives in memory only. The refresh token sits in an httpOnly cookie
// set by the API at /auth/login and /auth/refresh — never touchable from JS, so
// XSS can't exfiltrate it. The access token is short-lived (8h) and held in
// React state. On a fresh tab we silently try /auth/refresh; if the cookie is
// missing/expired the user lands on the login page.

interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  fullName: string;
  facilityId: string | null;
  facilityName: string | null;
}

interface SessionResponse {
  accessToken: string;
  expiresAt: number;
  user: UserProfile;
}

interface AuthContextType {
  accessToken: string | null;
  userId: string | null;
  email: string;
  role: AppRole;
  isCareVaultAdmin: boolean;
  isFacilityAdmin: boolean;
  isAnyAdmin: boolean;
  isResearcher: boolean;
  fullName: string;
  facilityId: string | null;
  facilityName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_PROFILE: UserProfile = {
  id: "",
  email: "",
  role: "clinician",
  fullName: "",
  facilityId: null,
  facilityName: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  // The current access token in a ref so callbacks (signOut, refresh) always
  // see the latest value without re-creating the api-client each render.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setProfile(EMPTY_PROFILE);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const result = await createApiClient(null).post<SessionResponse>("/auth/refresh");
      setAccessToken(result.accessToken);
      setProfile(result.user);
      return result.accessToken;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  // On mount, attempt a silent refresh. The cookie is httpOnly so we can't
  // peek at it; the only signal is whether /auth/refresh succeeds.
  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const result = await createApiClient(null).post<SessionResponse>("/auth/login", {
      email: emailInput,
      password,
    });
    setAccessToken(result.accessToken);
    setProfile(result.user);
  }, []);

  const signOut = useCallback(async () => {
    const token = tokenRef.current;
    // Tear down local state first — UI must not stay interactive while the
    // network call lingers.
    clearAuth();
    if (token) {
      void createApiClient(token).post("/auth/logout").catch(() => {});
    }
  }, [clearAuth]);

  const { showWarning, secondsLeft, staySignedIn } = useInactivityTimeout(signOut, !!accessToken);

  const role = profile.role;
  const isCareVaultAdmin = role === "carevault_admin";
  const isFacilityAdmin = role === "facility_admin";
  const isAnyAdmin = isCareVaultAdmin || isFacilityAdmin;
  const isResearcher = role === "researcher";

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        userId: profile.id || null,
        email: profile.email,
        role,
        isCareVaultAdmin,
        isFacilityAdmin,
        isAnyAdmin,
        isResearcher,
        fullName: profile.fullName,
        facilityId: profile.facilityId,
        facilityName: profile.facilityName ?? "",
        loading,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
      <InactivityWarningModal open={showWarning} secondsLeft={secondsLeft} onStay={staySignedIn} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
