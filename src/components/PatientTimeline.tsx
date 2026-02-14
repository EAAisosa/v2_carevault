import { useState } from "react";
import { Encounter, vitals, medications, allergies, labResults } from "@/data/mockData";
import DataSourceBadge from "./DataSourceBadge";
import StatusBadge from "./StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Thermometer, Pill, FlaskConical, AlertTriangle } from "lucide-react";

interface PatientTimelineProps {
  encounters: Encounter[];
}

export default function PatientTimeline({ encounters }: PatientTimelineProps) {
  const [selected, setSelected] = useState<Encounter | null>(null);

  // Find related data for the selected encounter's date/hospital
  const relatedVitals = selected
    ? vitals.filter((v) => v.date === selected.date && v.hospital === selected.hospital)
    : [];
  const relatedMeds = selected
    ? medications.filter((m) => m.prescribedBy === selected.practitioner || m.hospital === selected.hospital)
    : [];
  const relatedLabs = selected
    ? labResults.filter((l) => l.date === selected.date || l.hospital === selected.hospital)
    : [];
  const relatedAllergies = selected
    ? allergies.filter((a) => a.hospital === selected.hospital)
    : [];

  return (
    <>
      <div className="elevated-card rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Encounter Timeline</h3>
        <div className="relative space-y-0">
          {encounters.map((enc, i) => (
            <div
              key={enc.id}
              className="relative flex gap-4 pb-6 last:pb-0 cursor-pointer group"
              onClick={() => setSelected(enc)}
            >
              {i < encounters.length - 1 && (
                <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
              )}
              <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background group-hover:bg-primary/10 transition-colors">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0 rounded-lg p-2 -m-2 group-hover:bg-muted/50 transition-colors">
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

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs font-mono text-muted-foreground">
                    {new Date(selected.date).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <DialogTitle className="text-xl">{selected.diagnosis}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Stethoscope size={14} /> {selected.practitioner} — {selected.type} Visit
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1">
                <DataSourceBadge hospital={selected.hospital} />
              </div>

              <Tabs defaultValue="notes" className="mt-2">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="notes">Doctor's Notes</TabsTrigger>
                  {relatedVitals.length > 0 && <TabsTrigger value="vitals">Vitals</TabsTrigger>}
                  {relatedMeds.length > 0 && <TabsTrigger value="meds">Medications</TabsTrigger>}
                  {relatedLabs.length > 0 && <TabsTrigger value="labs">Labs</TabsTrigger>}
                  {relatedAllergies.length > 0 && <TabsTrigger value="allergies">Allergies</TabsTrigger>}
                </TabsList>

                <TabsContent value="notes" className="mt-4 space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm leading-relaxed text-foreground">{selected.notes}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border p-3">
                      <span className="text-muted-foreground">Encounter Type</span>
                      <p className="mt-1 font-semibold text-foreground">{selected.type}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <span className="text-muted-foreground">Status</span>
                      <div className="mt-1"><StatusBadge status={selected.status} /></div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <span className="text-muted-foreground">Practitioner</span>
                      <p className="mt-1 font-semibold text-foreground">{selected.practitioner}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <span className="text-muted-foreground">Facility</span>
                      <p className="mt-1 font-semibold text-foreground">{selected.hospital}</p>
                    </div>
                  </div>
                </TabsContent>

                {relatedVitals.length > 0 && (
                  <TabsContent value="vitals" className="mt-4">
                    {relatedVitals.map((v, i) => (
                      <div key={i} className="grid grid-cols-3 gap-3 text-xs">
                        {[
                          { icon: <Thermometer size={14} />, label: "Blood Pressure", value: `${v.systolic}/${v.diastolic} mmHg` },
                          { label: "Heart Rate", value: `${v.heartRate} bpm` },
                          { label: "Temperature", value: `${v.temperature}°C` },
                          { label: "Weight", value: `${v.weight} kg` },
                          { label: "SpO2", value: `${v.spO2}%` },
                        ].map((item, j) => (
                          <div key={j} className="rounded-lg border p-3">
                            <span className="text-muted-foreground">{item.label}</span>
                            <p className="mt-1 font-mono font-semibold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </TabsContent>
                )}

                {relatedMeds.length > 0 && (
                  <TabsContent value="meds" className="mt-4 space-y-2">
                    {relatedMeds.map((m, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <Pill size={16} className="mt-0.5 text-primary flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-foreground">{m.name} — {m.dosage}</p>
                          <p className="text-muted-foreground">{m.frequency} • Prescribed by {m.prescribedBy}</p>
                          <div className="mt-1"><StatusBadge status={m.status} /></div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                )}

                {relatedLabs.length > 0 && (
                  <TabsContent value="labs" className="mt-4 space-y-2">
                    {relatedLabs.map((l, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <FlaskConical size={16} className="mt-0.5 text-primary flex-shrink-0" />
                        <div className="text-xs flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">{l.test}</p>
                            <StatusBadge status={l.status} />
                          </div>
                          <p className="font-mono font-semibold mt-1">{l.result} {l.unit}</p>
                          <p className="text-muted-foreground">Ref: {l.referenceRange}</p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                )}

                {relatedAllergies.length > 0 && (
                  <TabsContent value="allergies" className="mt-4 space-y-2">
                    {relatedAllergies.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <AlertTriangle size={16} className="mt-0.5 text-destructive flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-foreground">{a.substance}</p>
                          <p className="text-muted-foreground">Reaction: {a.reaction}</p>
                          <div className="mt-1"><StatusBadge status={a.severity} /></div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
