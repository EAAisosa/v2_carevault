import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Building2, User, FileText, Clock, MessageSquare, Flag, AlertCircle, Search, Loader2 } from "lucide-react";

interface StagedRecord {
  id: string; patient_name: string; nin: string; source_facility_name: string;
  data_type: string; submitted_at: string; status: string; priority: string;
  summary: string; practitioner: string; conflict_type: string | null;
  flagged: boolean; admin_notes: string | null; fhir_resource_type: string | null;
}

export default function IntegratedRecords() {
  const [records, setRecords]   = useState<StagedRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<StagedRecord | null>(null);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      const { data } = await supabase
        .from("staged_records")
        .select("*")
        .eq("status", "approved")
        .order("submitted_at", { ascending: false });
      if (data) setRecords(data as StagedRecord[]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrated Records</h1>
        <p className="text-sm text-muted-foreground">Patient records approved and integrated into the national EHR</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, NIN, or facility…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
              {search ? "No integrated records match your search." : "No integrated records yet."}
            </div>
          ) : filtered.map((r) => (
            <div key={r.id}
              className={`elevated-card rounded-xl p-5 border-l-4 ${r.flagged ? "border-l-warning" : "border-l-transparent"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{r.patient_name}</h3>
                    <span className="font-mono text-xs text-muted-foreground">NIN: {r.nin}</span>
                    {r.flagged && <Flag size={12} className="text-warning" />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 size={11} />{r.source_facility_name}</span>
                    <span className="flex items-center gap-1"><FileText size={11} />{r.data_type}</span>
                    <span className="flex items-center gap-1"><User size={11} />{r.practitioner}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{new Date(r.submitted_at).toLocaleDateString("en-NG")}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.summary}</p>
                  {r.conflict_type && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                      <AlertCircle size={12} />{r.conflict_type}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={r.priority} />
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                    <Eye size={12} className="mr-1" /> View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.patient_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-muted-foreground">NIN</p><p className="font-mono font-medium">{selected.nin}</p></div>
                  <div><p className="text-muted-foreground">Data Type</p><p className="font-medium">{selected.data_type}</p></div>
                  <div><p className="text-muted-foreground">Facility</p><p className="font-medium">{selected.source_facility_name}</p></div>
                  <div><p className="text-muted-foreground">Practitioner</p><p className="font-medium">{selected.practitioner}</p></div>
                  <div><p className="text-muted-foreground">Submitted</p><p className="font-mono">{new Date(selected.submitted_at).toLocaleString("en-NG")}</p></div>
                  {selected.fhir_resource_type && <div><p className="text-muted-foreground">FHIR Type</p><p className="font-mono">{selected.fhir_resource_type}</p></div>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1"><FileText size={11} className="inline mr-1" />Summary</p>
                  <p className="text-sm text-foreground">{selected.summary}</p>
                </div>
                {selected.admin_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1"><MessageSquare size={11} className="inline mr-1" />Admin Notes</p>
                    <p className="text-sm text-foreground">{selected.admin_notes}</p>
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
