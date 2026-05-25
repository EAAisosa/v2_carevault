"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import DataSourceBadge from "@/components/DataSourceBadge";
import { useApi } from "@/hooks/useApi";
import type { PatientRecord } from "@repo/types";

export default function PatientSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const [data, setData] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<PatientRecord>(`/patients/${id}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground font-medium">Patient not found</p>
        <Link href="/search" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to Search</Link>
      </div>
    );
  }

  const { patient, encounters, vitalRecords: vitals, medications, allergies, labResults } = data;
  const severeAllergies = allergies.filter((a) => a.severity === "severe");

  const emptyState = (label: string) => (
    <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
      No {label} records found for this patient.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/search"
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {patient.firstName} {patient.lastName}
            </h1>
            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Shield size={10} /> Read-Only
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">NIN: {patient.nin}</span>
            <span>{patient.gender === "Male" ? "♂ Male" : "♀ Female"}</span>
            <span>DOB: {patient.dateOfBirth}</span>
            {patient.bloodGroup && <span>🩸 {patient.bloodGroup} / {patient.genotype}</span>}
            {patient.phone && <span>📞 {patient.phone}</span>}
          </div>
        </div>
      </div>

      {allergies.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle size={16} className="text-destructive flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-destructive">Known Allergies</p>
            <p className="text-xs text-foreground">
              {allergies.map((a) => `${a.substance} (${a.severity})`).join(" • ")}
            </p>
          </div>
        </div>
      )}

      {severeAllergies.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle size={16} className="text-warning flex-shrink-0" />
          <p className="text-xs font-semibold text-warning">
            {severeAllergies.map((a) => a.substance).join(", ")} — SEVERE reaction risk
          </p>
        </div>
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline {encounters.length > 0 && `(${encounters.length})`}</TabsTrigger>
          <TabsTrigger value="vitals">Vitals {vitals.length > 0 && `(${vitals.length})`}</TabsTrigger>
          <TabsTrigger value="medications">Medications {medications.length > 0 && `(${medications.length})`}</TabsTrigger>
          <TabsTrigger value="allergies">Allergies {allergies.length > 0 && `(${allergies.length})`}</TabsTrigger>
          <TabsTrigger value="labs">Lab Results {labResults.length > 0 && `(${labResults.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {encounters.length === 0 ? emptyState("encounter") : (
            <div className="space-y-3">
              {encounters.map((enc) => (
                <div key={enc.id} className="elevated-card rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{enc.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{enc.facilityName}</p>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{enc.encounterDate}</p>
                  </div>
                  {enc.notes && <p className="mt-2 text-xs text-foreground/80">{enc.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vitals">
          {vitals.length === 0 ? emptyState("vitals") : (
            <div className="elevated-card rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">BP</th>
                    <th className="px-4 py-3 font-medium">HR</th>
                    <th className="px-4 py-3 font-medium">Temp</th>
                    <th className="px-4 py-3 font-medium">Weight</th>
                    <th className="px-4 py-3 font-medium">SpO2</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.map((v) => (
                    <tr key={v.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-mono text-muted-foreground">{v.recordedDate}</td>
                      <td className="px-4 py-3 font-semibold">{v.systolic}/{v.diastolic}</td>
                      <td className="px-4 py-3">{v.heartRate} bpm</td>
                      <td className="px-4 py-3">{v.temperature}°C</td>
                      <td className="px-4 py-3">{v.weight} kg</td>
                      <td className="px-4 py-3">{v.spo2}%</td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={v.facilityName ?? null} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="medications">
          {medications.length === 0 ? emptyState("medication") : (
            <div className="elevated-card rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Medication</th>
                    <th className="px-4 py-3 font-medium">Dosage</th>
                    <th className="px-4 py-3 font-medium">Frequency</th>
                    <th className="px-4 py-3 font-medium">Prescribed By</th>
                    <th className="px-4 py-3 font-medium">Start Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((m) => (
                    <tr key={m.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                      <td className="px-4 py-3 font-mono">{m.dosage}</td>
                      <td className="px-4 py-3">{m.frequency}</td>
                      <td className="px-4 py-3">{m.prescribedBy}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{m.startDate}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={m.facilityName ?? null} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="allergies">
          {allergies.length === 0 ? emptyState("allergy") : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allergies.map((a) => (
                <div key={a.id} className="elevated-card rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{a.substance}</h4>
                    <StatusBadge status={a.severity} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Reaction: {a.reaction}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Reported by {a.reportedBy}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">{a.dateRecorded}</p>
                  <div className="mt-3">
                    <DataSourceBadge hospital={a.facilityName ?? null} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="labs">
          {labResults.length === 0 ? emptyState("lab result") : (
            <div className="elevated-card rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Test</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                    <th className="px-4 py-3 font-medium">Ref. Range</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {labResults.map((l) => (
                    <tr key={l.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{l.test}</td>
                      <td className="px-4 py-3 font-mono font-semibold">{l.result} {l.unit}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.referenceRange}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{l.resultDate}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={l.facilityName ?? null} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
