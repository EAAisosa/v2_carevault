"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createApiClient } from "@/lib/api-client";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import InactivityWarningModal from "@/components/InactivityWarningModal";
import type { AppRole } from "@repo/types";

const STORAGE_KEY = "carevault-auth";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  fullName: string;
  facilityId: string | null;
  facilityName: string | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: StoredTokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("clinician");
  const [fullName, setFullName] = useState("");
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [loading, setLoading] = useState(true);

  const applyProfile = (p: UserProfile) => {
    setUserId(p.id);
    setEmail(p.email);
    setRole(p.role);
    setFullName(p.fullName);
    setFacilityId(p.facilityId);
    setFacilityName(p.facilityName ?? "");
  };

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
    setEmail("");
    setRole("clinician");
    setFullName("");
    setFacilityId(null);
    setFacilityName("");
    clearTokens();
  }, []);

  const tryRefresh = useCallback(
    async (rToken: string): Promise<string | null> => {
      try {
        const result = await createApiClient(null).post<{
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
          user: UserProfile;
        }>("/auth/refresh", { refreshToken: rToken });

        saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken, expiresAt: result.expiresAt });
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        applyProfile(result.user);
        return result.accessToken;
      } catch {
        clearAuth();
        return null;
      }
    },
    [clearAuth]
  );

  useEffect(() => {
    const stored = loadTokens();
    if (!stored) {
      setLoading(false);
      return;
    }

    const isExpired = stored.expiresAt < Math.floor(Date.now() / 1000);

    (async () => {
      let token = stored.accessToken;

      if (isExpired) {
        const refreshed = await tryRefresh(stored.refreshToken);
        if (!refreshed) {
          setLoading(false);
          return;
        }
        token = refreshed;
      } else {
        setAccessToken(token);
        setRefreshToken(stored.refreshToken);
      }

      try {
        const data = await createApiClient(token).get<UserProfile>("/auth/me");
        applyProfile(data);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    })();
  }, [tryRefresh, clearAuth]);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const result = await createApiClient(null).post<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      user: UserProfile;
    }>("/auth/login", { email: emailInput, password });

    saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken, expiresAt: result.expiresAt });
    setAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    applyProfile(result.user);
  }, []);

  const signOut = useCallback(async () => {
    if (accessToken && refreshToken) {
      await createApiClient(accessToken).post("/auth/logout", { refreshToken }).catch(() => {});
    }
    clearAuth();
  }, [accessToken, refreshToken, clearAuth]);

  const { showWarning, secondsLeft, staySignedIn } = useInactivityTimeout(signOut, !!accessToken);

  const isCareVaultAdmin = role === "carevault_admin";
  const isFacilityAdmin = role === "facility_admin";
  const isAnyAdmin = isCareVaultAdmin || isFacilityAdmin;
  const isResearcher = role === "researcher";

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        userId,
        email,
        role,
        isCareVaultAdmin,
        isFacilityAdmin,
        isAnyAdmin,
        isResearcher,
        fullName,
        facilityId,
        facilityName,
        loading,
        signIn,
        signOut,
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
