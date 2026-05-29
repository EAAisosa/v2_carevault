"use client";

import Link from "next/link";
import { FlaskConical, ClipboardList, Database, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useMyResearchProjects } from "@/api/research";

export default function ResearchDashboardPage() {
  const query = useMyResearchProjects();
  const projects = query.data ?? [];
  const loading = query.isPending;

  const approved = projects.filter((p) => p.status === "approved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Research Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your approved research projects and data access</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="elevated-card rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Projects</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{projects.length}</p>
        </div>
        <div className="elevated-card rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{approved.length}</p>
        </div>
        <div className="elevated-card rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Review</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{projects.filter((p) => p.status === "pending_carevault" || p.status === "pending_facilities").length}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/research/projects", icon: <ClipboardList size={24} />, label: "My Projects", desc: "View and manage your research projects" },
          { href: "/research/explore", icon: <Database size={24} />, label: "Explore Data", desc: "Query de-identified patient data" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="elevated-card rounded-xl p-5 hover:border-primary/30 transition-colors group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 transition-colors">
              {item.icon}
            </div>
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : approved.length === 0 ? (
        <div className="elevated-card rounded-xl p-8 text-center">
          <FlaskConical size={32} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No approved projects yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Submit a research project request to get data access.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Approved Projects</h2>
          <div className="space-y-2">
            {approved.map((p) => (
              <div key={p.id} className="elevated-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">PI: {p.createdBy}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
