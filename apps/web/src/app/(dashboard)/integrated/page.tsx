"use client";

import { Archive, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useStagedRecords } from "@/api/staged-records";

export default function IntegratedRecordsPage() {
  const query = useStagedRecords({ status: "approved", pageSize: 100 });
  const records = query.data?.records ?? [];
  const loading = query.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrated Records</h1>
        <p className="text-sm text-muted-foreground">Patient records that have been reviewed and approved into the longitudinal record</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Archive size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No integrated records yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Approved staging records will appear here.</p>
        </div>
      ) : (
        <div className="elevated-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">NIN</th>
                <th className="px-4 py-3 font-medium">Source Facility</th>
                <th className="px-4 py-3 font-medium">Data Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{r.patientName}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{r.nin}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.sourceFacilityName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.dataType}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {new Date(r.submittedAt).toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
