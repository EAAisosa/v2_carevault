"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  GitMerge,
  Archive,
  Shield,
  Building2,
  Users,
  Menu,
  ChevronRight,
  LogOut,
  Plug,
  FlaskConical,
  ClipboardList,
  Database,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  access: "clinician_portal" | "any_admin" | "carevault_admin" | "researcher_portal" | "researcher_review_admin";
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} />, access: "clinician_portal" },
  { label: "Patient Search", path: "/search", icon: <Search size={18} />, access: "clinician_portal" },
  { label: "Staging Queue", path: "/staging", icon: <GitMerge size={18} />, access: "any_admin" },
  { label: "Integrated Records", path: "/integrated", icon: <Archive size={18} />, access: "any_admin" },
  { label: "Facilities", path: "/facilities", icon: <Building2 size={18} />, access: "carevault_admin" },
  { label: "EHR Connections", path: "/connections", icon: <Plug size={18} />, access: "any_admin" },
  { label: "User Management", path: "/users", icon: <Users size={18} />, access: "any_admin" },
  { label: "Audit Logs", path: "/audit", icon: <Shield size={18} />, access: "carevault_admin" },
  { label: "Research Requests", path: "/research-requests", icon: <Inbox size={18} />, access: "researcher_review_admin" },
  { label: "Research Dashboard", path: "/research", icon: <FlaskConical size={18} />, access: "researcher_portal" },
  { label: "My Projects", path: "/research/projects", icon: <ClipboardList size={18} />, access: "researcher_portal" },
  { label: "Explore Data", path: "/research/explore", icon: <Database size={18} />, access: "researcher_portal" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isAnyAdmin, isCareVaultAdmin, isResearcher, fullName, email, signOut } = useAuth();

  const visibleItems = navItems.filter((n) => {
    switch (n.access) {
      case "clinician_portal": return !isResearcher;
      case "any_admin": return isAnyAdmin;
      case "carevault_admin": return isCareVaultAdmin;
      case "researcher_review_admin": return isAnyAdmin;
      case "researcher_portal": return isResearcher;
      default: return false;
    }
  });

  const clinicianNav = visibleItems.filter((n) => n.access === "clinician_portal");
  const adminNav = visibleItems.filter(
    (n) => n.access === "any_admin" || n.access === "carevault_admin" || n.access === "researcher_review_admin",
  );
  const researcherNav = visibleItems.filter((n) => n.access === "researcher_portal");

  const displayName = fullName || email || "User";
  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const roleLabel = role === "carevault_admin"
    ? "CareVault Admin"
    : role === "facility_admin"
      ? "Facility Admin"
      : role === "researcher"
        ? "Researcher"
        : "Clinician";

  const renderNavItem = (item: NavItem) => {
    const active = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
      >
        {item.icon}
        {item.label}
        {active && <ChevronRight size={14} className="ml-auto" />}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col" style={{ background: "var(--gradient-sidebar)" }}>
      <div className="flex items-center px-4 py-5">
        <span className="text-lg font-bold text-sidebar-primary tracking-tight">CareVault</span>
      </div>

      <nav className="flex-1 space-y-6 px-3 py-4">
        {clinicianNav.length > 0 && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Clinician Portal
            </p>
            <div className="space-y-1">{clinicianNav.map(renderNavItem)}</div>
          </div>
        )}
        {researcherNav.length > 0 && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Researcher Portal
            </p>
            <div className="space-y-1">{researcherNav.map(renderNavItem)}</div>
          </div>
        )}
        {isAnyAdmin && adminNav.length > 0 && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Administration
            </p>
            <div className="space-y-1">{adminNav.map(renderNavItem)}</div>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 space-y-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
        >
          <LogOut size={12} />
          Sign Out
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">{roleLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 flex-shrink-0 lg:block">{sidebarContent}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full animate-slide-in-right">{sidebarContent}</aside>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur-sm lg:px-8">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground font-mono">FHIR R4 Compliant</span>
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" title="System Online" />
        </header>
        <div className="p-4 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
