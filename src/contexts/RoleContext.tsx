import { createContext, useContext, useState, ReactNode } from "react";

export type AppRole = "clinician" | "administrator";

interface RoleContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
  isAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("clinician");

  return (
    <RoleContext.Provider value={{ role, setRole, isAdmin: role === "administrator" }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
