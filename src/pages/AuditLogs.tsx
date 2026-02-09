import { useState } from "react";
import { auditLogs } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const filtered = auditLogs.filter(
    (l) =>
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Complete access and change trail for all NHRIRP operations</p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by user, action, or resource…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="elevated-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Hospital</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className={`border-b border-border/50 last:border-0 ${log.status === "warning" ? "bg-warning/5" : log.status === "failure" ? "bg-destructive/5" : ""}`}>
                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{log.user}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.role}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{log.resource}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.hospital}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{log.ipAddress}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
