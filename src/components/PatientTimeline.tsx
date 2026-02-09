import { Encounter } from "@/data/mockData";
import DataSourceBadge from "./DataSourceBadge";
import StatusBadge from "./StatusBadge";

interface PatientTimelineProps {
  encounters: Encounter[];
}

export default function PatientTimeline({ encounters }: PatientTimelineProps) {
  return (
    <div className="elevated-card rounded-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Encounter Timeline</h3>
      <div className="relative space-y-0">
        {encounters.map((enc, i) => (
          <div key={enc.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {i < encounters.length - 1 && (
              <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
            )}
            {/* Dot */}
            <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {new Date(enc.date).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                </span>
                <StatusBadge status={enc.status} />
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-medium text-foreground">{enc.type}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{enc.diagnosis}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{enc.practitioner}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{enc.notes}</p>
              <div className="mt-2">
                <DataSourceBadge hospital={enc.hospital} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
