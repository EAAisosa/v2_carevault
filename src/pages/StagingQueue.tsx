import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Eye, AlertCircle, Filter, Flag, MessageSquare, Building2, User, FileText, Clock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StagedRecord {
  id: string;
  patient_name: string;
  nin: string;
  source_facility_name: string;
  data_type: string;
  submitted_at: string;
  status: string;
  priority: string;
  summary: string;
  practitioner: string;
  conflict_type: string | null;
  flagged: boolean;
  admin_notes: string | null;
  fhir_resource_type: string | null;
}

export default function StagingQueue() {
  const [filter, setFilter] = useState<string>("all");
  const [records, setRecords] = useState<StagedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StagedRecord | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<StagedRecord | null>(null);
  const [noteText, setNoteText] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staged_records")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading records", description: error.message, variant: "destructive" });
    } else {
      setRecords((data as StagedRecord[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const nonIntegrated = records.filter((r) => r.status !== "approved");
  const filtered = filter === "all" ? nonIntegrated : filter === "flagged" ? nonIntegrated.filter((r) => r.flagged) : nonIntegrated.filter((r) => r.status === filter);

  const updateRecord = async (id: string, updates: Partial<StagedRecord>) => {
    const { error } = await supabase.from("staged_records").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
    }
  };

  const handleIntegrate = async (r: StagedRecord) => {
    await updateRecord(r.id, { status: "approved" });
    toast({ title: "Record integrated", description: `${r.patient_name}'s record has been approved.` });
  };

  const handleNeedsReview = async (r: StagedRecord) => {
    await updateRecord(r.id, { status: "needs-review" });
  };

  const handleFlag = (record: StagedRecord) => {
    setFlagTarget(record);
    setNoteText(record.admin_notes || "");
    setFlagDialogOpen(true);
  };

  const saveFlag = async () => {
    if (!flagTarget) return;
    await updateRecord(flagTarget.id, { flagged: true, admin_notes: noteText });
    setFlagDialogOpen(false);
    setFlagTarget(null);
    setNoteText("");
  };

  const removeFlag = async () => {
    if (!flagTarget) return;
    await updateRecord(flagTarget.id, { flagged: false, admin_notes: null });
    setFlagDialogOpen(false);
    setFlagTarget(null);
    setNoteText("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Incoming Patient Records</h1>
        <p className="text-sm text-muted-foreground">Records pulled from connected EHR systems — review and integrate into the longitudinal record</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-muted-foreground" />
        {["all", "pending", "needs-review", "flagged"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">
            {f === "flagged" ? "🚩 Flagged" : f.replace("-", " ")}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
              {records.length === 0 ? "No records yet. Use the Sync button on a facility to simulate an EHR pull." : "No records match the current filter."}
            </div>
          )}
          {filtered.map((r) => (
            <div key={r.id} className={`elevated-card rounded-xl p-5 animate-fade-in border-l-4 ${r.flagged ? "border-l-warning" : "border-l-transparent"}`}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.patient_name}</p>
                    <StatusBadge status={r.status as any} />
                    {r.flagged && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning uppercase tracking-wider">
                        <Flag size={10} fill="currentColor" /> Flagged
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setSelected(r)}>
                      <Eye size={12} /> View
                    </Button>
                    <Button variant="outline" size="sm" className={`text-xs gap-1.5 ${r.flagged ? "text-warning border-warning/30 hover:bg-warning/5" : ""}`} onClick={() => handleFlag(r)}>
                      <Flag size={12} /> {r.flagged ? "Edit Flag" : "Flag"}
                    </Button>
                    <Button size="sm" className="text-xs gap-1.5 bg-success hover:bg-success/90" onClick={() => handleIntegrate(r)}>
                      <Check size={12} /> Integrate
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 text-warning border-warning/30 hover:bg-warning/5" onClick={() => handleNeedsReview(r)}>
                      <AlertCircle size={12} /> Needs Review
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">NIN: {r.nin}</span>
                  <span className="flex items-center gap-1"><Building2 size={10} /> {r.source_facility_name}</span>
                  <span className="flex items-center gap-1"><FileText size={10} /> {r.data_type}</span>
                  <span className="flex items-center gap-1"><User size={10} /> {r.practitioner}</span>
                  <span className="flex items-center gap-1 font-mono"><Clock size={10} /> {new Date(r.submitted_at).toLocaleString("en-NG")}</span>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed">{r.summary}</p>

                {r.conflict_type && (
                  <p className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertCircle size={12} /> {r.conflict_type}
                  </p>
                )}

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
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.patient_name}
                  <StatusBadge status={selected.status as any} />
                  {selected.flagged && <Flag size={14} className="text-warning" fill="currentColor" />}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">NIN</span><p className="font-mono mt-0.5">{selected.nin}</p></div>
                  <div><span className="text-muted-foreground">Source Facility</span><p className="mt-0.5">{selected.source_facility_name}</p></div>
                  <div><span className="text-muted-foreground">Data Type</span><p className="mt-0.5">{selected.data_type}</p></div>
                  <div><span className="text-muted-foreground">Practitioner</span><p className="mt-0.5">{selected.practitioner}</p></div>
                  <div><span className="text-muted-foreground">FHIR Resource</span><p className="mt-0.5 font-mono">{selected.fhir_resource_type || "—"}</p></div>
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

      {/* Flag dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={(open) => !open && setFlagDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag size={16} className="text-warning" />
              {flagTarget?.flagged ? "Edit Flag" : "Flag Record"} — {flagTarget?.patient_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Add notes to flag this record for review.</p>
            <Textarea placeholder="Enter admin notes..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} className="text-sm" />
          </div>
          <DialogFooter className="gap-2">
            {flagTarget?.flagged && (
              <Button variant="outline" size="sm" onClick={removeFlag} className="text-xs text-destructive">Remove Flag</Button>
            )}
            <Button size="sm" onClick={saveFlag} disabled={!noteText.trim()} className="text-xs gap-1.5">
              <Flag size={12} /> {flagTarget?.flagged ? "Update Flag" : "Flag Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
