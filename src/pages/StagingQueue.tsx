import { useState } from "react";
import { stagingRecords, StagingRecord } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Eye, AlertCircle, Filter, Flag, MessageSquare, Building2, User, FileText, Clock } from "lucide-react";

export default function StagingQueue() {
  const [filter, setFilter] = useState<string>("all");
  const [records, setRecords] = useState<StagingRecord[]>(stagingRecords);
  const [selected, setSelected] = useState<StagingRecord | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<StagingRecord | null>(null);
  const [noteText, setNoteText] = useState("");

  const filtered = filter === "all" ? records : filter === "flagged" ? records.filter((r) => r.flagged) : records.filter((r) => r.status === filter);

  const handleFlag = (record: StagingRecord) => {
    setFlagTarget(record);
    setNoteText(record.adminNotes || "");
    setFlagDialogOpen(true);
  };

  const saveFlag = () => {
    if (!flagTarget) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === flagTarget.id ? { ...r, flagged: true, adminNotes: noteText } : r
      )
    );
    setFlagDialogOpen(false);
    setFlagTarget(null);
    setNoteText("");
  };

  const removeFlag = () => {
    if (!flagTarget) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === flagTarget.id ? { ...r, flagged: false, adminNotes: undefined } : r
      )
    );
    setFlagDialogOpen(false);
    setFlagTarget(null);
    setNoteText("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Incoming Patient Records</h1>
        <p className="text-sm text-muted-foreground">Recent records from other facilities for your registered patients — ready for EHR integration</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-muted-foreground" />
        {["all", "pending", "needs-review", "approved", "rejected", "flagged"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">
            {f === "flagged" ? "🚩 Flagged" : f.replace("-", " ")}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">No records match the current filter.</div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className={`elevated-card rounded-xl p-5 animate-fade-in border-l-4 ${r.flagged ? "border-l-warning" : "border-l-transparent"}`}>
            <div className="flex flex-col gap-3">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.patientName}</p>
                  <StatusBadge status={r.priority} />
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
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs gap-1.5 ${r.flagged ? "text-warning border-warning/30 hover:bg-warning/5" : ""}`}
                    onClick={() => handleFlag(r)}
                  >
                    <Flag size={12} /> {r.flagged ? "Edit Flag" : "Flag"}
                  </Button>
                  <Button size="sm" className="text-xs gap-1.5 bg-success hover:bg-success/90">
                    <Check size={12} /> Integrate
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <X size={12} /> Dismiss
                  </Button>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono">NIN: {r.nin}</span>
                <span className="flex items-center gap-1"><Building2 size={10} /> {r.sourceHospital}</span>
                <span className="flex items-center gap-1"><FileText size={10} /> {r.dataType}</span>
                <span className="flex items-center gap-1"><User size={10} /> {r.practitioner}</span>
                <span className="flex items-center gap-1 font-mono"><Clock size={10} /> {new Date(r.submittedAt).toLocaleString("en-NG")}</span>
              </div>

              {/* Summary */}
              <p className="text-xs text-foreground/80 leading-relaxed">{r.summary}</p>

              {/* Conflict warning */}
              {r.conflictType && (
                <p className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertCircle size={12} />
                  {r.conflictType}
                </p>
              )}

              {/* Admin notes */}
              {r.flagged && r.adminNotes && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                  <MessageSquare size={12} className="text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-warning-foreground leading-relaxed">{r.adminNotes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.patientName}
                  <StatusBadge status={selected.status} />
                  {selected.flagged && <Flag size={14} className="text-warning" fill="currentColor" />}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">NIN</span><p className="font-mono mt-0.5">{selected.nin}</p></div>
                  <div><span className="text-muted-foreground">Source Facility</span><p className="mt-0.5">{selected.sourceHospital}</p></div>
                  <div><span className="text-muted-foreground">Data Type</span><p className="mt-0.5">{selected.dataType}</p></div>
                  <div><span className="text-muted-foreground">Practitioner</span><p className="mt-0.5">{selected.practitioner}</p></div>
                  <div><span className="text-muted-foreground">Priority</span><div className="mt-0.5"><StatusBadge status={selected.priority} /></div></div>
                  <div><span className="text-muted-foreground">Submitted</span><p className="font-mono mt-0.5">{new Date(selected.submittedAt).toLocaleString("en-NG")}</p></div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Clinical Summary</p>
                  <p className="text-xs leading-relaxed bg-muted/50 rounded-lg p-3">{selected.summary}</p>
                </div>

                {selected.conflictType && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                    <AlertCircle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-warning">Data Conflict</p>
                      <p className="text-xs text-warning-foreground">{selected.conflictType}</p>
                    </div>
                  </div>
                )}

                {selected.flagged && selected.adminNotes && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
                    <MessageSquare size={14} className="text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-warning">Admin Notes</p>
                      <p className="text-xs text-warning-foreground">{selected.adminNotes}</p>
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
              {flagTarget?.flagged ? "Edit Flag" : "Flag Record"} — {flagTarget?.patientName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Add notes to flag this record for review. Notes will be visible to all administrators.</p>
            <Textarea
              placeholder="Enter admin notes (e.g., 'Verify allergy data with source facility before integrating')"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            {flagTarget?.flagged && (
              <Button variant="outline" size="sm" onClick={removeFlag} className="text-xs text-destructive">
                Remove Flag
              </Button>
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
