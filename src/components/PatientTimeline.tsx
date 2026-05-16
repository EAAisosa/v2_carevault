import { useState } from "react";
import type { Encounter, VitalRecord, Medication, LabResult, Allergy } from "@/pages/PatientSummary";
import DataSourceBadge from "./DataSourceBadge";
import StatusBadge from "./StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Thermometer, Pill, FlaskConical, AlertTriangle } from "lucide-react";

interface PatientTimelineProps {
  encounters: Encounter[];
  vitals: VitalRecord[];
  medications: Medication[];
  labResults: LabResult[];
  allergies: Allergy[];
}

export default function PatientTimeline({ encounters, vitals, medications, labResults, allergies }: PatientTimelineProps) {
  const [selected, setSelected] = useState<Encounter | null>(null);

  const relatedVitals = selected
    ? vitals.filter((v) => v.recorded_date === selected.encounter_date && v.facility_name === selected.facility_name)
    : [];
  const relatedMeds = selected
    ? medications.filter((m) => m.prescribed_by === selected.practitioner || m.facility_name === selected.facility_name)
    : [];
  const relatedLabs = selected
    ? labResults.filter((l) => l.test_date === selected.encounter_date || l.facility_name === selected.facility_name)
    : [];
  const relatedAllergies = selected
    ? allergies.filter((a) => a.facility_name === selected.facility_name)
    : [];

  return (
    <>
      <div className="space-y-3">
        {encounters.map((enc) => (
          <button
            key={enc.id}
            onClick={() => setSelected(enc)}
            className="w-full text-left elevated-card rounded-xl p-5 hover:shadow-md transition-all border-l-4 border-l-primary/30 hover:border-l-primary"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                  <Stethoscope size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{enc.diagnosis}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{enc.encounter_type} · {enc.practitioner}</p>
                  <DataSourceBadge hospital={enc.facility_name} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-muted-foreground">{enc.encounter_date}</p>
                <StatusBadge status={enc.status} />
              </div>
            </div>
            {enc.notes && (
              <p className="mt-3 text-xs text-muted-foreground border-t border-border/50 pt-3 line-clamp-2">{enc.notes}</p>
            )}
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.diagnosis}</DialogTitle>
                <DialogDescription>
                  {selected.encounter_date} · {selected.encounter_type} · {selected.facility_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Clinician Notes</p>
                  <p className="text-sm text-foreground">{selected.notes ?? "No notes recorded."}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Practitioner:</span> {selected.practitioner}
                </div>
                <Tabs defaultValue="vitals">
                  <TabsList>
                    <TabsTrigger value="vitals" className="text-xs">
                      <Thermometer size={12} className="mr-1" /> Vitals {relatedVitals.length > 0 && `(${relatedVitals.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="meds" className="text-xs">
                      <Pill size={12} className="mr-1" /> Medications {relatedMeds.length > 0 && `(${relatedMeds.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="labs" className="text-xs">
                      <FlaskConical size={12} className="mr-1" /> Labs {relatedLabs.length > 0 && `(${relatedLabs.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="allergies" className="text-xs">
                      <AlertTriangle size={12} className="mr-1" /> Allergies {relatedAllergies.length > 0 && `(${relatedAllergies.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="vitals">
                    {relatedVitals.length === 0
                      ? <p className="text-xs text-muted-foreground py-4 text-center">No vitals recorded for this encounter.</p>
                      : relatedVitals.map((v, i) => (
                          <div key={i} className="grid grid-cols-3 gap-3 py-3 border-b last:border-0 text-xs">
                            <div><p className="text-muted-foreground">BP</p><p className="font-semibold">{v.systolic}/{v.diastolic} mmHg</p></div>
                            <div><p className="text-muted-foreground">HR</p><p className="font-semibold">{v.heart_rate} bpm</p></div>
                            <div><p className="text-muted-foreground">Temp</p><p className="font-semibold">{v.temperature}°C</p></div>
                            <div><p className="text-muted-foreground">Weight</p><p className="font-semibold">{v.weight} kg</p></div>
                            <div><p className="text-muted-foreground">SpO2</p><p className="font-semibold">{v.spo2}%</p></div>
                          </div>
                        ))}
                  </TabsContent>

                  <TabsContent value="meds">
                    {relatedMeds.length === 0
                      ? <p className="text-xs text-muted-foreground py-4 text-center">No medications linked to this encounter.</p>
                      : relatedMeds.map((m) => (
                          <div key={m.id} className="flex justify-between items-start py-3 border-b last:border-0 text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{m.name} {m.dosage}</p>
                              <p className="text-muted-foreground">{m.frequency}</p>
                            </div>
                            <StatusBadge status={m.status} />
                          </div>
                        ))}
                  </TabsContent>

                  <TabsContent value="labs">
                    {relatedLabs.length === 0
                      ? <p className="text-xs text-muted-foreground py-4 text-center">No lab results linked to this encounter.</p>
                      : relatedLabs.map((l) => (
                          <div key={l.id} className="flex justify-between items-center py-3 border-b last:border-0 text-xs">
                            <div>
                              <p className="font-medium text-foreground">{l.test_name}</p>
                              <p className="font-mono text-muted-foreground">{l.result} {l.unit}</p>
                            </div>
                            <StatusBadge status={l.status} />
                          </div>
                        ))}
                  </TabsContent>

                  <TabsContent value="allergies">
                    {relatedAllergies.length === 0
                      ? <p className="text-xs text-muted-foreground py-4 text-center">No allergies from this facility.</p>
                      : relatedAllergies.map((a) => (
                          <div key={a.id} className="flex justify-between items-start py-3 border-b last:border-0 text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{a.substance}</p>
                              <p className="text-muted-foreground">{a.reaction}</p>
                            </div>
                            <StatusBadge status={a.severity} />
                          </div>
                        ))}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
