import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface AuditLog {
  id: string; created_at: string; actor_name: string; actor_role: string;
  action: string; resource: string; facility_name: string | null;
  ip_address: string | null; status: string;
}

export default function AuditLogs() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) setLogs(data as AuditLog[]);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
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
        <Input placeholder="Search by user, action, or resource…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? "No logs match your search." : "No audit logs yet."}
                </td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-NG")}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{log.actor_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.actor_role}</td>
                  <td className="px-4 py-3 font-mono">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground truncate max-w-[180px]">{log.resource}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.facility_name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{log.ip_address ?? "—"}</td>
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
