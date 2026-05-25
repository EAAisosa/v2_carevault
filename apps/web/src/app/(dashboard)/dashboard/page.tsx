"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Activity, GitMerge, Database, RefreshCw } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import type { DashboardStats, StagedRecord, SyncLog } from "@repo/types";

type SyncLogWithFacility = SyncLog & { facilityName?: string };

export default function DashboardPage() {
  const { isAnyAdmin } = useAuth();
  const api = useApi();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentStaging, setRecentStaging] = useState<StagedRecord[]>([]);
  const [recentSyncs, setRecentSyncs] = useState<SyncLogWithFacility[]>([]);

  useEffect(() => {
    api.get<{ stats: DashboardStats; recentStaging: StagedRecord[]; recentSyncs: SyncLogWithFacility[] }>(
      "/dashboard/stats",
    ).then((data) => {
      setStats(data.stats);
      setRecentStaging(data.recentStaging ?? []);
      setRecentSyncs(data.recentSyncs ?? []);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">National Health Records — Overview</p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isAnyAdmin ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
        <StatsCard label="Total Patients" value={stats?.totalPatients ?? 0} icon={<Users size={20} />} trend="Live from DB" trendUp />
        <StatsCard label="Total Users" value={stats?.totalUsers ?? 0} icon={<Database size={20} />} trend="Live from DB" trendUp />
        {isAnyAdmin && <StatsCard label="Facilities Connected" value={stats?.totalFacilities ?? 0} icon={<Activity size={20} />} />}
        {isAnyAdmin && <StatsCard label="Pending Staged" value={stats?.pendingStagedRecords ?? 0} icon={<GitMerge size={20} />} trend="Live from DB" trendUp />}
      </div>

      {isAnyAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Staging Queue</h3>
              <Link href="/staging" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentStaging.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No pending records.</p>
              )}
              {recentStaging.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.patientName}</p>
                    <p className="text-xs text-muted-foreground">{r.sourceFacilityName} · {r.dataType}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="elevated-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Recent Sync Activity</h3>
              <Link href="/connections" className="text-xs font-medium text-primary hover:underline">View all →</Link>
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
                      {log.facilityName ?? "Unknown Facility"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.direction?.toUpperCase() ?? "INBOUND"} · {log.recordsProcessed ?? 0} records
                      {" · "}
                      {new Date(log.startedAt).toLocaleString("en-NG", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
