import { Users, Activity, GitMerge, Search, AlertTriangle, Database } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { dashboardStats, stagingRecords, hospitalConnectors, auditLogs } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const recentStaging = stagingRecords.filter((s) => s.status === "pending" || s.status === "needs-review").slice(0, 4);
  const recentAudit = auditLogs.slice(0, 5);
  const connectorsSummary = hospitalConnectors.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">NHRIRP National Health Records — Overview</p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isAdmin ? "xl:grid-cols-6" : "xl:grid-cols-3"}`}>
        <StatsCard label="Total Patients" value={dashboardStats.totalPatients} icon={<Users size={20} />} trend="+2.3% this month" trendUp />
        <StatsCard label="Total Encounters" value={dashboardStats.totalEncounters} icon={<Database size={20} />} trend="+1,240 today" trendUp />
        {isAdmin && <StatsCard label="Hospitals Connected" value={dashboardStats.connectedHospitals} icon={<Activity size={20} />} />}
        {isAdmin && <StatsCard label="Pending Merges" value={dashboardStats.pendingMerges} icon={<GitMerge size={20} />} trend="3 critical" />}
        <StatsCard label="Today's Searches" value={dashboardStats.todaySearches} icon={<Search size={20} />} trend="+12% vs yesterday" trendUp />
        {isAdmin && <StatsCard label="Active Alerts" value={dashboardStats.activeAlerts} icon={<AlertTriangle size={20} />} />}
      </div>

      <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-2" : ""}`}>
        {/* Staging queue preview - admin only */}
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
                    <StatusBadge status={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connector status preview - admin only */}
        {isAdmin && (
          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Hospital Connectors</h3>
              <Link to="/connectors" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {connectorsSummary.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.location} • {c.ehrSystem}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground font-mono">{c.uptime}%</span>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent audit logs - admin only */}
      {isAdmin && (
        <div className="elevated-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Audit Activity</h3>
            <Link to="/audit" className="text-xs font-medium text-primary hover:underline">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Action</th>
                  <th className="pb-2 pr-4 font-medium">Resource</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2.5 pr-4 font-medium text-foreground">{log.user}</td>
                    <td className="py-2.5 pr-4 font-mono text-muted-foreground">{log.action}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{log.resource}</td>
                    <td className="py-2.5"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
