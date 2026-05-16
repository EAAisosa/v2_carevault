import { useEffect, useState } from "react";
import { Users, Activity, GitMerge, Search, Database, RefreshCw } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type StagedRecord = Tables<"staged_records">;
type SyncLog = Tables<"sync_logs"> & { facilities: { name: string } | null };

export default function Dashboard() {
  const { isAnyAdmin, isCareVaultAdmin } = useAuth();

  const [stats, setStats] = useState({ totalPatients: 0, totalFacilities: 0, pendingMerges: 0 });
  const [recentStaging, setRecentStaging] = useState<StagedRecord[]>([]);
  const [recentSyncs, setRecentSyncs] = useState<SyncLog[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [pRes, fRes, pendingRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("staged_records").select("id", { count: "exact", head: true }).in("status", ["pending", "needs-review"]),
      ]);
      setStats({
        totalPatients: pRes.count || 0,
        totalFacilities: fRes.count || 0,
        pendingMerges: pendingRes.count || 0,
      });
    };

    const fetchStaging = async () => {
      const { data } = await supabase
        .from("staged_records")
        .select("*")
        .in("status", ["pending", "needs-review"])
        .order("submitted_at", { ascending: false })
        .limit(4);
      setRecentStaging(data || []);
    };

    const fetchSyncs = async () => {
      const { data } = await supabase
        .from("sync_logs")
        .select("*, facilities(name)")
        .order("started_at", { ascending: false })
        .limit(5);
      setRecentSyncs((data as SyncLog[]) || []);
    };

    fetchStats();
    if (isAnyAdmin) {
      fetchStaging();
      fetchSyncs();
    }
  }, [isAnyAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">NHRIRP National Health Records — Overview</p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isAnyAdmin ? "xl:grid-cols-5" : "xl:grid-cols-3"}`}>
        <StatsCard label="Total Patients" value={stats.totalPatients.toLocaleString()} icon={<Users size={20} />} trend="Live from DB" trendUp />
        <StatsCard label="Total Encounters" value="—" icon={<Database size={20} />} trend="Not yet available" />
        {isAnyAdmin && <StatsCard label="Facilities Connected" value={stats.totalFacilities} icon={<Activity size={20} />} />}
        {isAnyAdmin && <StatsCard label="Pending Merges" value={stats.pendingMerges} icon={<GitMerge size={20} />} trend="Live from DB" trendUp />}
        <StatsCard label="Today's Searches" value="—" icon={<Search size={20} />} trend="Not yet available" />
      </div>

      <div className={`grid gap-6 ${isAnyAdmin ? "lg:grid-cols-2" : ""}`}>
        {isAnyAdmin && (
          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Staging Queue</h3>
              <Link to="/staging" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentStaging.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No pending records.</p>
              )}
              {recentStaging.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{r.source_facility_name} • {r.data_type}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAnyAdmin && (
          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Recent Sync Activity</h3>
              <Link to="/connectors" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentSyncs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No sync activity found.</p>
              )}
              {recentSyncs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                      <RefreshCw size={12} className="shrink-0" />
                      {log.facilities?.name || "Unknown Facility"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.direction.toUpperCase()} • {log.records_processed} records
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
