import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";

type AuditLog = Tables<"audit_logs">;

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  "PATIENT_SEARCH",
  "RECORD_VIEW",
  "BREAK_GLASS_ACCESS",
  "STAGING_APPROVE",
  "STAGING_REJECT",
  "STAGING_FLAG",
  "STAGING_NEEDS_REVIEW",
  "USER_INVITE",
  "USER_DEACTIVATE",
  "USER_ACTIVATE",
  "USER_DELETE",
  "USER_ROLE_CHANGE",
  "USER_PASSWORD_RESET",
  "USER_INVITE_RESENT",
  "FACILITY_STATUS_CHANGE",
];

const ROLE_OPTIONS = [
  { value: "clinician",        label: "Clinician" },
  { value: "facility_admin",   label: "Facility Admin" },
  { value: "carevault_admin",  label: "CareVault Admin" },
  { value: "researcher",       label: "Researcher" },
];

export default function AuditLogs() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);

  // Filters
  const [search,     setSearch]     = useState("");
  const [action,     setAction]     = useState("all");
  const [role,       setRole]       = useState("all");
  const [status,     setStatus]     = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  const hasFilters = search || action !== "all" || role !== "all" || status !== "all" || dateFrom || dateTo;

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (search)        query = query.ilike("user_name", `%${search}%`);
    if (action !== "all") query = query.eq("action", action);
    if (role   !== "all") query = query.eq("role", role);
    if (status !== "all") query = query.eq("status", status);
    if (dateFrom)      query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte("created_at", end.toISOString());
    }

    const { data, count } = await query;
    setLogs(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, action, role, status, dateFrom, dateTo]);

  // Reset to page 0 when any filter changes
  useEffect(() => { setPage(0); }, [search, action, role, status, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearFilters = () => {
    setSearch("");
    setAction("all");
    setRole("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Complete access and change trail for all CareVault operations</p>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="elevated-card rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Action */}
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTION_OPTIONS.map((a) => (
                <SelectItem key={a} value={a} className="text-xs font-mono">{a.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role */}
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>

          {/* Date from */}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] h-9 text-xs"
            title="From date"
          />

          {/* Date to */}
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] h-9 text-xs"
            title="To date"
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
              <X size={12} /> Clear
            </Button>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `Showing ${from}–${to} of ${total.toLocaleString()} entries`}
        </p>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="elevated-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Timestamp</th>
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
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {hasFilters ? "No logs match the current filters." : "No audit logs yet — activity will appear here automatically."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors ${
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
                    <td className="px-4 py-3 font-mono text-muted-foreground">{(log as any).ip_address || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft size={12} /> Previous
            </Button>

            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next <ChevronRight size={12} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
