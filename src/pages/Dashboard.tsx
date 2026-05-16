import { useEffect, useState } from "react";
import { Users, Activity, GitMerge, Search, Database, Loader2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StagedRecord {
  id: string; patient_name: string; source_facility_name: string;
  data_type: string; status: string;
}

interface AuditLog {
  id: string; action: string; actor_name: string;
  resource: string; status: string;
}

interface Stats {
  totalPatients: number; totalFacilities: number;
  pendingMerges: number; todaySearches: number;
}

export default function Dashboard() {
  const { isAnyAdmin, isCareVaultAdmin } = useAuth();
  const [stats, setStats]               = useState<Stats>({ totalPatients: 0, totalFacilities: 0, pendingMerges: 0, todaySearches: 0 });
  const [recentStaging, setRecentStaging] = useState<StagedRecord[]>([]);
  const [recentAudit, setRecentAudit]   = useState<AuditLog[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [pRes, fRes, stagingRes, auditRes, pendingRes, searchRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("staged_records").select("id, patient_name, source_facility_name, data_type, status")
          .in("status", ["pending", "needs-review"]).order("submitted_at", { ascending: false }).limit(4),
        isCareVaultAdmin
          ? supabase.from("audit_logs").select("id, action, actor_name, resource, status")
              .order("created_at", { ascending: false }).limit(5)
          : Promise.resolve({ data: [] }),
        supabase.from("staged_records").select("id", { count: "exact", head: true }).in("status", ["pending", "needs-review"]),
        supabase.from("audit_logs").select("id", { count: "exact", head: true })
          .eq("action", "PATIENT_SEARCH").gte("created_at", todayStart.toISOString()),
      ]);

      setStats({
        totalPatients: pRes.count ?? 0,
        totalFacilities: fRes.count ?? 0,
        pendingMerges: pendingRes.count ?? 0,
        todaySearches: searchRes.count ?? 0,
      });
      if (stagingRes.data) setRecentStaging(stagingRes.data as StagedRecord[]);
      if (auditRes.data)   setRecentAudit(auditRes.data as AuditLog[]);
      setLoading(false);
    };
    fetchAll();
  }, [isCareVaultAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">NHRIRP National Health Records — Overview</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isAnyAdmin ? "xl:grid-cols-5" : "xl:grid-cols-3"}`}>
            <StatsCard label="Total Patients" value={stats.totalPatients.toLocaleString()} icon={<Users size={20} />} trend="Live" trendUp />
            <StatsCard label="Total Encounters" value="—" icon={<Database size={20} />} trend="Coming soon" />
            {isAnyAdmin && <StatsCard label="Facilities Connected" value={stats.totalFacilities} icon={<Activity size={20} />} />}
            {isAnyAdmin && <StatsCard label="Pending Merges" value={stats.pendingMerges} icon={<GitMerge size={20} />}
              trend={stats.pendingMerges > 0 ? `${stats.pendingMerges} awaiting review` : "All clear"} />}
            <StatsCard label="Today's Searches" value={stats.todaySearches.toLocaleString()} icon={<Search size={20} />} trend="Live" trendUp />
          </div>

          <div className={`grid gap-6 ${isAnyAdmin ? "lg:grid-cols-2" : ""}`}>
            {isAnyAdmin && (
              <div className="elevated-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Staging Queue</h3>
                  <Link to="/staging" className="text-xs font-medium text-primary hover:underline">View all →</Link>
                </div>
                {recentStaging.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No pending records.</p>
                ) : (
                  <div className="space-y-3">
                    {recentStaging.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{r.source_facility_name} · {r.data_type}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isCareVaultAdmin && (
              <div className="elevated-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Recent Audit Activity</h3>
                  <Link to="/audit" className="text-xs font-medium text-primary hover:underline">View all →</Link>
                </div>
                {recentAudit.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No audit events yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentAudit.map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.actor_name} · {log.resource}</p>
                        </div>
                        <StatusBadge status={log.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
