import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import carevaultLogo from "@/assets/carevault-logo.png";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  section: "clinician" | "admin";
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={18} />, section: "clinician" },
  { label: "Patient Search", path: "/search", icon: <Search size={18} />, section: "clinician" },
  { label: "Staging Queue", path: "/staging", icon: <GitMerge size={18} />, section: "admin" },
  { label: "Integrated Records", path: "/integrated", icon: <Archive size={18} />, section: "admin" },
  { label: "Facilities", path: "/facilities", icon: <Building2 size={18} />, section: "admin" },
  { label: "User Management", path: "/users", icon: <Users size={18} />, section: "admin" },
  { label: "Audit Logs", path: "/audit", icon: <Shield size={18} />, section: "admin" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isAdmin, fullName, signOut, user } = useAuth();

  const clinicianNav = navItems.filter((n) => n.section === "clinician");
  const adminNav = navItems.filter((n) => n.section === "admin");

  const displayName = fullName || user?.email || "User";
  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const renderNavItem = (item: NavItem) => {
    const active = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
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
        <img src={carevaultLogo} alt="CareVault" className="h-10 object-contain" />
      </div>

      <nav className="flex-1 space-y-6 px-3 py-4">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Clinician Portal
          </p>
          <div className="space-y-1">{clinicianNav.map(renderNavItem)}</div>
        </div>
        {isAdmin && (
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
            <p className="truncate text-[10px] text-sidebar-foreground/50">
              {role === "clinician" ? "Clinician" : "NHRIRP Administrator"}
            </p>
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
