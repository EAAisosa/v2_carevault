import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

type AuditLog = Tables<"audit_logs">;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();

    // Real-time: new audit events appear instantly without a page refresh
    const channel = supabase
      .channel("audit_logs_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        setLogs((prev) => [payload.new as AuditLog, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = logs.filter((l) => {
    const term = search.toLowerCase();
    return (
      l.user_name.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      l.resource.toLowerCase().includes(term) ||
      l.role.toLowerCase().includes(term) ||
      l.facility_name.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Complete access and change trail for all NHRIRP operations</p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by user, action, or resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {search ? "No logs match your search." : "No audit logs yet — activity will appear here automatically."}
                  </td>
                </tr>
              )}
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-border/50 last:border-0 ${
                    log.status === "warning" ? "bg-warning/5" : log.status === "failure" ? "bg-destructive/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-NG", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{log.user_name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{log.role.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground max-w-[180px] truncate">{log.resource}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.facility_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{log.ip_address}</td>
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
