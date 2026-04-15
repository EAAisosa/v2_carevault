import { useEffect, useState } from "react";
import { Users, Activity, GitMerge, Search, AlertTriangle, Database } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { stagingRecords, auditLogs } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { isAnyAdmin, isCareVaultAdmin } = useAuth();
  const recentStaging = stagingRecords.filter((s) => s.status === "pending" || s.status === "needs-review").slice(0, 4);
  const recentAudit = auditLogs.slice(0, 5);

  const [stats, setStats] = useState({ totalPatients: 0, totalFacilities: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [pRes, fRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id, name, location, ehr_system, status, uptime", { count: "exact" }),
      ]);
      setStats({
        totalPatients: pRes.count || 0,
        totalFacilities: fRes.count || 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">NHRIRP National Health Records — Overview</p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-3"}`}>
        <StatsCard label="Total Patients" value={stats.totalPatients.toLocaleString()} icon={<Users size={20} />} trend="Live from DB" trendUp />
        <StatsCard label="Total Encounters" value="4,892,340" icon={<Database size={20} />} trend="Mock data" />
        {isAdmin && <StatsCard label="Facilities Connected" value={stats.totalFacilities} icon={<Activity size={20} />} />}
        {isAdmin && <StatsCard label="Pending Merges" value={14} icon={<GitMerge size={20} />} trend="3 critical" />}
        <StatsCard label="Today's Searches" value={2847} icon={<Search size={20} />} trend="+12% vs yesterday" trendUp />
      </div>

      <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-2" : ""}`}>
        {isAdmin && (
          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Staging Queue</h3>
              <Link to="/staging" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentStaging.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.patientName}</p>
                    <p className="text-xs text-muted-foreground">{r.sourceHospital} • {r.dataType}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Recent Audit Activity</h3>
              <Link to="/audit" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.user} • {log.resource}</p>
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
