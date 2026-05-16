import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Building2, User, FileText, Clock, MessageSquare, Flag, AlertCircle, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type StagedRecord = Tables<"staged_records">;

export default function IntegratedRecords() {
  const [records, setRecords] = useState<StagedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StagedRecord | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      const { data } = await supabase
        .from("staged_records")
        .select("*")
        .eq("status", "approved")
        .order("submitted_at", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    fetchRecords();
  }, []);

  const filtered = records.filter(
    (r) =>
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.nin.includes(search) ||
      r.source_facility_name.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-foreground">Integrated Records</h1>
        <p className="text-sm text-muted-foreground">
          Archive of patient records that have been approved and integrated into the EHR
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, NIN, or facility…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
            {search ? "No integrated records match your search." : "No integrated records yet."}
          </div>
        )}
        {filtered.map((r) => (
          <div
            key={r.id}
            className={`elevated-card rounded-xl p-5 animate-fade-in border-l-4 ${r.flagged ? "border-l-warning" : "border-l-transparent"}`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.patient_name}</p>
                  <StatusBadge status={r.status} />
                  {r.flagged && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning uppercase tracking-wider">
                      <Flag size={10} fill="currentColor" /> Flagged
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 flex-shrink-0" onClick={() => setSelected(r)}>
                  <Eye size={12} /> View
                </Button>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono">NIN: {r.nin}</span>
                <span className="flex items-center gap-1"><Building2 size={10} /> {r.source_facility_name}</span>
                <span className="flex items-center gap-1"><FileText size={10} /> {r.data_type}</span>
                <span className="flex items-center gap-1"><User size={10} /> {r.practitioner}</span>
                <span className="flex items-center gap-1 font-mono"><Clock size={10} /> {new Date(r.submitted_at).toLocaleString("en-NG")}</span>
              </div>

              <p className="text-xs text-foreground/80 leading-relaxed">{r.summary}</p>

              {r.flagged && r.admin_notes && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                  <MessageSquare size={12} className="text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-warning-foreground leading-relaxed">{r.admin_notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.patient_name}
                  <StatusBadge status={selected.status} />
                  {selected.flagged && <Flag size={14} className="text-warning" fill="currentColor" />}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">NIN</span><p className="font-mono mt-0.5">{selected.nin}</p></div>
                  <div><span className="text-muted-foreground">Source Facility</span><p className="mt-0.5">{selected.source_facility_name}</p></div>
                  <div><span className="text-muted-foreground">Data Type</span><p className="mt-0.5">{selected.data_type}</p></div>
                  <div><span className="text-muted-foreground">Practitioner</span><p className="mt-0.5">{selected.practitioner}</p></div>
                  <div><span className="text-muted-foreground">Submitted</span><p className="font-mono mt-0.5">{new Date(selected.submitted_at).toLocaleString("en-NG")}</p></div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Clinical Summary</p>
                  <p className="text-xs leading-relaxed bg-muted/50 rounded-lg p-3">{selected.summary}</p>
                </div>

                {selected.conflict_type && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                    <AlertCircle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-warning">Data Conflict</p>
                      <p className="text-xs text-warning-foreground">{selected.conflict_type}</p>
                    </div>
                  </div>
                )}

                {selected.flagged && selected.admin_notes && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                    <MessageSquare size={14} className="text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-warning">Admin Notes</p>
                      <p className="text-xs text-warning-foreground">{selected.admin_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
