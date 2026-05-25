"use client";

import { useState, useEffect } from "react";
import { Inbox, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { ResearchProject } from "@repo/types";

export default function ResearchRequestsPage() {
  const api = useApi();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ResearchProject[]>("/research-projects")
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/research-projects/${id}`, { status: "approved" });
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: "approved" as ResearchProject["status"] } : p));
      toast.success("Research project approved");
    } catch { toast.error("Failed to approve project"); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/research-projects/${id}`, { status: "rejected" });
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: "rejected" as ResearchProject["status"] } : p));
      toast.success("Research project rejected");
    } catch { toast.error("Failed to reject project"); }
  };

  const pending = projects.filter((p) => p.status === "pending_carevault");
  const reviewed = projects.filter((p) => p.status !== "pending_carevault");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Research Requests</h1>
        <p className="text-sm text-muted-foreground">Review and approve researcher data access requests</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Inbox size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No research requests</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Pending Review ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((p) => (
                  <div key={p.id} className="elevated-card rounded-xl p-5 border-l-4 border-l-warning">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PI: {p.createdBy}</p>
                        <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{p.description}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" className="text-xs gap-1 bg-success hover:bg-success/90" onClick={() => handleApprove(p.id)}>
                          <CheckCircle size={12} /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive border-destructive/30" onClick={() => handleReject(p.id)}>
                          <XCircle size={12} /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Previously Reviewed</h2>
              <div className="space-y-2">
                {reviewed.map((p) => (
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
      )}
    </div>
  );
}
