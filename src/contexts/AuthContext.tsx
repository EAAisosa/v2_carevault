import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import InactivityWarningModal from "@/components/InactivityWarningModal";

export type AppRole = "clinician" | "facility_admin" | "carevault_admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  isCareVaultAdmin: boolean;
  isFacilityAdmin: boolean;
  isAnyAdmin: boolean;
  fullName: string;
  facilityId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>("clinician");
  const [fullName, setFullName] = useState("");
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData) {
      setRole(roleData.role as AppRole);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, facility_id")
      .eq("id", userId)
      .single();

    if (profile) {
      setFullName(profile.full_name);
      setFacilityId(profile.facility_id || null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole("clinician");
          setFullName("");
          setFacilityId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole("clinician");
    setFullName("");
    setFacilityId(null);
  }, []);

  const { showWarning, secondsLeft, staySignedIn } = useInactivityTimeout(signOut, !!session);

  const isCareVaultAdmin = role === "carevault_admin";
  const isFacilityAdmin = role === "facility_admin";
  const isAnyAdmin = isCareVaultAdmin || isFacilityAdmin;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        isCareVaultAdmin,
        isFacilityAdmin,
        isAnyAdmin,
        fullName,
        facilityId,
        loading,
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
