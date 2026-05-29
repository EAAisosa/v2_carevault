"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import type { AppRole } from "@repo/types";

// Path → roles permitted to load it. Longest match wins.
// Pages with no entry default to "any signed-in user" (the auth gate alone).
const ROUTE_ACCESS: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/audit", roles: ["carevault_admin"] },
  { prefix: "/facilities", roles: ["carevault_admin"] },
  { prefix: "/research-requests", roles: ["carevault_admin"] },
  { prefix: "/staging", roles: ["carevault_admin", "facility_admin"] },
  { prefix: "/integrated", roles: ["carevault_admin", "facility_admin"] },
  { prefix: "/connections", roles: ["carevault_admin", "facility_admin"] },
  { prefix: "/users", roles: ["carevault_admin", "facility_admin"] },
  { prefix: "/research", roles: ["researcher"] },
  { prefix: "/patient", roles: ["clinician", "facility_admin", "carevault_admin"] },
  { prefix: "/search", roles: ["clinician", "facility_admin", "carevault_admin"] },
  { prefix: "/dashboard", roles: ["clinician", "facility_admin", "carevault_admin"] },
];

function allowedFor(pathname: string, role: AppRole): boolean {
  const match = ROUTE_ACCESS
    .filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (!match) return true;
  return match.roles.includes(role);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, loading, role, isResearcher } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPermitted = useMemo(
    () => (accessToken ? allowedFor(pathname ?? "", role) : false),
    [accessToken, pathname, role]
  );

  useEffect(() => {
    if (loading) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (!isPermitted) {
      router.replace(isResearcher ? "/research" : "/dashboard");
    }
  }, [loading, accessToken, isPermitted, isResearcher, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Block render until permission is confirmed — prevents the page from firing API
  // requests with the user's token before the redirect lands.
  if (!accessToken || !isPermitted) return null;

  return <AppLayout>{children}</AppLayout>;
}
