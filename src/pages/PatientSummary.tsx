import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuditLog } from "@/hooks/useAuditLog";
import PatientTimeline from "@/components/PatientTimeline";
import VitalsChart from "@/components/VitalsChart";
import DataSourceBadge from "@/components/DataSourceBadge";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PatientRow   = Tables<"patients"> & { facilities: { name: string } | null };
type Encounter    = Tables<"encounters">;
type VitalRecord  = Tables<"vital_records">;
type Medication   = Tables<"medications">;
type Allergy      = Tables<"allergies">;
type LabResult    = Tables<"lab_results">;

export default function PatientSummary() {
  const { id } = useParams();

  const [patient,     setPatient]     = useState<PatientRow | null>(null);
  const [encounters,  setEncounters]  = useState<Encounter[]>([]);
  const [vitals,      setVitals]      = useState<VitalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies,   setAllergies]   = useState<Allergy[]>([]);
  const [labResults,  setLabResults]  = useState<LabResult[]>([]);
  const [loading,     setLoading]     = useState(true);
  const { log } = useAuditLog();

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [patRes, encRes, vitRes, medRes, algRes, labRes] = await Promise.all([
        supabase.from("patients").select("*, facilities(name)").eq("id", id).single(),
        supabase.from("encounters").select("*").eq("patient_id", id).order("encounter_date", { ascending: false }),
        supabase.from("vital_records").select("*").eq("patient_id", id).order("recorded_date", { ascending: false }),
        supabase.from("medications").select("*").eq("patient_id", id).order("start_date", { ascending: false }),
        supabase.from("allergies").select("*").eq("patient_id", id).order("date_recorded", { ascending: false }),
        supabase.from("lab_results").select("*").eq("patient_id", id).order("result_date", { ascending: false }),
      ]);

      if (!patRes.error && patRes.data) {
        const p = patRes.data as PatientRow;
        setPatient(p);
        log("RECORD_VIEW", {
          resource: `Patient/NIN:${p.nin}`,
          status: "success",
          metadata: { patient_id: p.id, patient_name: `${p.first_name} ${p.last_name}` },
        });
      }
      setEncounters(encRes.data || []);
      setVitals(vitRes.data || []);
      setMedications(medRes.data || []);
      setAllergies(algRes.data || []);
      setLabResults(labRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground font-medium">Patient not found</p>
        <Link to="/search" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to Search</Link>
      </div>
    );
  }

  const severeAllergies = allergies.filter((a) => a.severity === "severe");

  // Shape encounters into the format PatientTimeline expects
  const timelineEncounters = encounters.map((e) => ({
    id: e.id,
    date: e.encounter_date,
    hospital: e.facility_name,
    practitioner: e.practitioner,
    type: e.type,
    diagnosis: e.diagnosis,
    notes: e.notes,
    status: e.status as "completed" | "in-progress",
  }));

  // Shape vitals into the format VitalsChart expects
  const vitalsData = vitals.map((v) => ({
    date: v.recorded_date,
    hospital: v.facility_name,
    systolic: v.systolic ?? 0,
    diastolic: v.diastolic ?? 0,
    heartRate: v.heart_rate ?? 0,
    temperature: v.temperature ?? 0,
    weight: v.weight ?? 0,
    spO2: v.spo2 ?? 0,
  }));

  const emptyState = (label: string) => (
    <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
      No {label} records found for this patient.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link
          to="/search"
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {patient.first_name} {patient.last_name}
            </h1>
            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Shield size={10} /> Read-Only
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">NIN: {patient.nin}</span>
            <span>{patient.gender === "Male" ? "♂ Male" : "♀ Female"}</span>
            <span>DOB: {patient.date_of_birth}</span>
            {patient.blood_group && <span>🩸 {patient.blood_group} / {patient.genotype}</span>}
            {patient.phone && <span>📞 {patient.phone}</span>}
          </div>
          {patient.facilities?.name && (
            <p className="mt-1 text-xs text-muted-foreground">Registered at: {patient.facilities.name}</p>
          )}
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
          {encounters.length === 0 ? emptyState("encounter") : <PatientTimeline encounters={timelineEncounters} />}
        </TabsContent>

        <TabsContent value="vitals">
          {vitals.length === 0 ? emptyState("vitals") : (
            <>
              <VitalsChart data={vitals} />
              <div className="mt-4 elevated-card rounded-xl overflow-hidden">
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
                        <td className="px-4 py-3 font-mono text-muted-foreground">{v.recorded_date}</td>
                        <td className="px-4 py-3 font-semibold">{v.systolic}/{v.diastolic}</td>
                        <td className="px-4 py-3">{v.heart_rate} bpm</td>
                        <td className="px-4 py-3">{v.temperature}°C</td>
                        <td className="px-4 py-3">{v.weight} kg</td>
                        <td className="px-4 py-3">{v.spo2}%</td>
                        <td className="px-4 py-3"><DataSourceBadge hospital={v.facility_name} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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
                      <td className="px-4 py-3">{m.prescribed_by}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{m.start_date}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={m.facility_name} /></td>
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
                  <p className="mt-1 text-xs text-muted-foreground">Reported by {a.reported_by}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">{a.date_recorded}</p>
                  <div className="mt-3">
                    <DataSourceBadge hospital={a.facility_name} />
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
                      <td className="px-4 py-3 text-muted-foreground">{l.reference_range}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{l.result_date}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={l.facility_name} /></td>
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
