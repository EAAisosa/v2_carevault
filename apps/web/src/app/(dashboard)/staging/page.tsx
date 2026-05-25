"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Eye, AlertCircle, Filter, Flag, MessageSquare, Building2, User, FileText, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { StagedRecord } from "@repo/types";

export default function StagingQueuePage() {
  const api = useApi();
  const [filter, setFilter] = useState("all");
  const [records, setRecords] = useState<StagedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StagedRecord | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<StagedRecord | null>(null);
  const [noteText, setNoteText] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ records: StagedRecord[] }>("/staged-records?pageSize=100");
      setRecords(data.records);
    } catch (err) {
      toast.error("Failed to load staging records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, []);

  const nonIntegrated = records.filter((r) => r.status !== "approved");
  const filtered =
    filter === "all" ? nonIntegrated
    : filter === "flagged" ? nonIntegrated.filter((r) => r.flagged)
    : nonIntegrated.filter((r) => r.status === filter);

  const handleIntegrate = async (r: StagedRecord) => {
    setActing(r.id);
    try {
      await api.post(`/staged-records/${r.id}/approve`);
      toast.success(`${r.patientName}'s record integrated`);
      fetchRecords();
    } catch { toast.error("Failed to approve record"); }
    finally { setActing(null); }
  };

  const handleNeedsReview = async (r: StagedRecord) => {
    setActing(r.id);
    try {
      await api.post(`/staged-records/${r.id}/needs-review`);
      fetchRecords();
    } catch { toast.error("Failed to update status"); }
    finally { setActing(null); }
  };

  const handleFlag = (record: StagedRecord) => {
    setFlagTarget(record);
    setNoteText(record.adminNotes ?? "");
    setFlagDialogOpen(true);
  };

  const saveFlag = async () => {
    if (!flagTarget) return;
    try {
      await api.post(`/staged-records/${flagTarget.id}/flag`);
      toast.success("Record flagged");
      setFlagDialogOpen(false);
      fetchRecords();
    } catch { toast.error("Failed to flag record"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Incoming Patient Records</h1>
        <p className="text-sm text-muted-foreground">
          Records pulled from connected EHR systems — review and integrate into the longitudinal record
        </p>
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
              {records.length === 0 ? "No records yet. Trigger a sync to pull from EHR systems." : "No records match the current filter."}
            </div>
          )}
          {filtered.map((r) => (
            <div key={r.id} className={`elevated-card rounded-xl p-5 animate-fade-in border-l-4 ${r.flagged ? "border-l-warning" : "border-l-transparent"}`}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.patientName}</p>
                    <StatusBadge status={r.status} />
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
                    <Button variant="outline" size="sm" onClick={() => handleFlag(r)} className={`text-xs gap-1.5 ${r.flagged ? "text-warning border-warning/30" : ""}`}>
                      <Flag size={12} /> {r.flagged ? "Edit Flag" : "Flag"}
                    </Button>
                    <Button size="sm" className="text-xs gap-1.5 bg-success hover:bg-success/90" onClick={() => handleIntegrate(r)} disabled={acting === r.id}>
                      {acting === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Integrate
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 text-warning border-warning/30" onClick={() => handleNeedsReview(r)}>
                      <AlertCircle size={12} /> Needs Review
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">NIN: {r.nin}</span>
                  <span className="flex items-center gap-1"><Building2 size={10} /> {r.sourceFacilityName}</span>
                  <span className="flex items-center gap-1"><FileText size={10} /> {r.dataType}</span>
                  <span className="flex items-center gap-1"><User size={10} /> {r.practitioner}</span>
                  <span className="flex items-center gap-1 font-mono"><Clock size={10} /> {new Date(r.submittedAt).toLocaleString("en-NG")}</span>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed">{r.summary}</p>

                {r.conflictType && (
                  <p className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertCircle size={12} /> {r.conflictType}
                  </p>
                )}

                {r.flagged && r.adminNotes && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                    <MessageSquare size={12} className="text-warning mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed">{r.adminNotes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.patientName}
                  <StatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">NIN</span><p className="font-mono mt-0.5">{selected.nin}</p></div>
                  <div><span className="text-muted-foreground">Source Facility</span><p className="mt-0.5">{selected.sourceFacilityName}</p></div>
                  <div><span className="text-muted-foreground">Data Type</span><p className="mt-0.5">{selected.dataType}</p></div>
                  <div><span className="text-muted-foreground">Practitioner</span><p className="mt-0.5">{selected.practitioner}</p></div>
                  <div><span className="text-muted-foreground">Submitted</span><p className="font-mono mt-0.5">{new Date(selected.submittedAt).toLocaleString("en-NG")}</p></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Clinical Summary</p>
                  <p className="text-xs leading-relaxed bg-muted/50 rounded-lg p-3">{selected.summary}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag size={16} className="text-warning" />
              Flag Record — {flagTarget?.patientName}
            </DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Enter admin notes..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} className="text-sm" />
          <DialogFooter>
            <Button size="sm" onClick={saveFlag} className="text-xs gap-1.5">
              <Flag size={12} /> Flag Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
