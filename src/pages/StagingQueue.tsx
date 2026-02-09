import { useState } from "react";
import { stagingRecords } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, AlertCircle, Filter } from "lucide-react";

export default function StagingQueue() {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? stagingRecords : stagingRecords.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staging Queue</h1>
        <p className="text-sm text-muted-foreground">Review and merge incoming clinical data from hospital connectors</p>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        {["all", "pending", "needs-review", "approved", "rejected"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">
            {f.replace("-", " ")}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="elevated-card rounded-xl p-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{r.patientName}</p>
                  <StatusBadge status={r.priority} />
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">NIN: {r.nin}</span>
                  <span>From: {r.sourceHospital}</span>
                  <span>Type: {r.dataType}</span>
                  <span className="font-mono">{new Date(r.submittedAt).toLocaleString("en-NG")}</span>
                </div>
                {r.conflictType && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                    <AlertCircle size={12} />
                    {r.conflictType}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Eye size={12} /> Review
                </Button>
                <Button size="sm" className="text-xs gap-1.5 bg-success hover:bg-success/90">
                  <Check size={12} /> Approve
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <X size={12} /> Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
