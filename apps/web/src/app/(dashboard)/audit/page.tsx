"use client";

import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { useAuditLogs } from "@/api/audit-logs";

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [page, setPage] = useState(1);

  const query = useAuditLogs({ page, pageSize: PAGE_SIZE, action: appliedFilter });

  const logs = query.data?.records ?? [];
  const total = query.data?.total ?? 0;
  const loading = query.isPending;

  const handleSearch = () => { setPage(1); setAppliedFilter(actionFilter); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">NDPA-compliant record of all user and system actions</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Filter by action (e.g. RECORD_VIEW)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs font-mono text-sm"
        />
        <Button variant="outline" size="sm" onClick={handleSearch}>Filter</Button>
        {appliedFilter && <Button variant="ghost" size="sm" onClick={() => { setActionFilter(""); setAppliedFilter(""); setPage(1); }}>Clear</Button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Shield size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="elevated-card rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("en-NG")}
                    </td>
                    <td className="px-4 py-3 text-foreground">{l.userName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.role.replace("_", " ")} />
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{l.action}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground max-w-[200px] truncate">{l.resource}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{l.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{total} total logs · showing page {page}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
