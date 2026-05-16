import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PatientTimeline from "@/components/PatientTimeline";
import VitalsChart from "@/components/VitalsChart";
import DataSourceBadge from "@/components/DataSourceBadge";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PatientDetail {
  id: string; nin: string; first_name: string; last_name: string;
  gender: string; date_of_birth: string; phone: string | null;
  blood_group: string | null; genotype: string | null;
  lga: string | null; state: string | null; facility_name?: string;
}
export interface Encounter {
  id: string; encounter_date: string; facility_name: string;
  practitioner: string; encounter_type: string; diagnosis: string;
  notes: string | null; status: string;
}
export interface VitalRecord {
  recorded_date: string; facility_name: string;
  systolic: number | null; diastolic: number | null;
  heart_rate: number | null; temperature: number | null;
  weight: number | null; spo2: number | null;
}
export interface Medication {
  id: string; name: string; dosage: string; frequency: string;
  prescribed_by: string; facility_name: string;
  start_date: string; end_date: string | null; status: string;
}
export interface Allergy {
  id: string; substance: string; reaction: string; severity: string;
  reported_by: string; facility_name: string; date_recorded: string;
}
export interface LabResult {
  id: string; test_name: string; result: string; unit: string | null;
  reference_range: string | null; test_date: string;
  facility_name: string; status: string;
}

export default function PatientSummary() {
  const { id } = useParams();
  const [patient, setPatient]         = useState<PatientDetail | null>(null);
  const [encounters, setEncounters]   = useState<Encounter[]>([]);
  const [vitals, setVitals]           = useState<VitalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies]     = useState<Allergy[]>([]);
  const [labResults, setLabResults]   = useState<LabResult[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [pR, eR, vR, mR, aR, lR] = await Promise.all([
        supabase.from("patients").select("*, facilities(name)").eq("id", id).single(),
        supabase.from("encounters").select("*").eq("patient_id", id).order("encounter_date", { ascending: false }),
        supabase.from("vital_records").select("*").eq("patient_id", id).order("recorded_date", { ascending: false }),
        supabase.from("medications").select("*").eq("patient_id", id).order("start_date", { ascending: false }),
        supabase.from("allergies").select("*").eq("patient_id", id).order("date_recorded", { ascending: false }),
        supabase.from("lab_results").select("*").eq("patient_id", id).order("test_date", { ascending: false }),
      ]);
      if (pR.data) setPatient({ ...pR.data, facility_name: (pR.data as any).facilities?.name ?? "Unknown" });
      if (eR.data) setEncounters(eR.data as Encounter[]);
      if (vR.data) setVitals(vR.data as VitalRecord[]);
      if (mR.data) setMedications(mR.data as Medication[]);
      if (aR.data) setAllergies(aR.data as Allergy[]);
      if (lR.data) setLabResults(lR.data as LabResult[]);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-foreground font-medium">Patient not found</p>
      <Link to="/search" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to Search</Link>
    </div>
  );

  const knownAllergies = allergies.length > 0
    ? allergies.map((a) => `${a.substance} (${a.severity})`).join(" • ")
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link to="/search" className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{patient.first_name} {patient.last_name}</h1>
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
          {patient.facility_name && <p className="mt-1 text-xs text-muted-foreground">Registered at: {patient.facility_name}</p>}
        </div>
      </div>

      {knownAllergies && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle size={16} className="text-destructive flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-destructive">Known Allergies</p>
            <p className="text-xs text-foreground">{knownAllergies}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline {encounters.length > 0 && `(${encounters.length})`}</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="medications">Medications {medications.length > 0 && `(${medications.length})`}</TabsTrigger>
          <TabsTrigger value="allergies">Allergies {allergies.length > 0 && `(${allergies.length})`}</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {encounters.length === 0
            ? <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">No encounters recorded yet.</div>
            : <PatientTimeline encounters={encounters} vitals={vitals} medications={medications} labResults={labResults} allergies={allergies} />}
        </TabsContent>

        <TabsContent value="vitals">
          {vitals.length === 0
            ? <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">No vitals recorded yet.</div>
            : <>
                <VitalsChart data={vitals} />
                <div className="mt-4 elevated-card rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">BP</th>
                      <th className="px-4 py-3 font-medium">HR</th><th className="px-4 py-3 font-medium">Temp</th>
                      <th className="px-4 py-3 font-medium">Weight</th><th className="px-4 py-3 font-medium">SpO2</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                    </tr></thead>
                    <tbody>{vitals.map((v, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{v.recorded_date}</td>
                        <td className="px-4 py-3 font-semibold">{v.systolic != null ? `${v.systolic}/${v.diastolic}` : "—"}</td>
                        <td className="px-4 py-3">{v.heart_rate != null ? `${v.heart_rate} bpm` : "—"}</td>
                        <td className="px-4 py-3">{v.temperature != null ? `${v.temperature}°C` : "—"}</td>
                        <td className="px-4 py-3">{v.weight != null ? `${v.weight} kg` : "—"}</td>
                        <td className="px-4 py-3">{v.spo2 != null ? `${v.spo2}%` : "—"}</td>
                        <td className="px-4 py-3"><DataSourceBadge hospital={v.facility_name} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>}
        </TabsContent>

        <TabsContent value="medications">
          {medications.length === 0
            ? <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">No medications recorded yet.</div>
            : <div className="elevated-card rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Medication</th><th className="px-4 py-3 font-medium">Dosage</th>
                    <th className="px-4 py-3 font-medium">Frequency</th><th className="px-4 py-3 font-medium">Prescribed By</th>
                    <th className="px-4 py-3 font-medium">Start Date</th><th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                  </tr></thead>
                  <tbody>{medications.map((m) => (
                    <tr key={m.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                      <td className="px-4 py-3 font-mono">{m.dosage}</td>
                      <td className="px-4 py-3">{m.frequency}</td>
                      <td className="px-4 py-3">{m.prescribed_by}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{m.start_date}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={m.facility_name} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
        </TabsContent>

        <TabsContent value="allergies">
          {allergies.length === 0
            ? <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">No allergies recorded yet.</div>
            : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allergies.map((a) => (
                  <div key={a.id} className="elevated-card rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{a.substance}</h4>
                      <StatusBadge status={a.severity} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Reaction: {a.reaction}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Reported by {a.reported_by}</p>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">{a.date_recorded}</p>
                    <div className="mt-3"><DataSourceBadge hospital={a.facility_name} /></div>
                  </div>
                ))}
              </div>}
        </TabsContent>

        <TabsContent value="labs">
          {labResults.length === 0
            ? <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">No lab results recorded yet.</div>
            : <div className="elevated-card rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Test</th><th className="px-4 py-3 font-medium">Result</th>
                    <th className="px-4 py-3 font-medium">Ref. Range</th><th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Source</th>
                  </tr></thead>
                  <tbody>{labResults.map((l) => (
                    <tr key={l.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{l.test_name}</td>
                      <td className="px-4 py-3 font-mono font-semibold">{l.result} {l.unit ?? ""}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.reference_range ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{l.test_date}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3"><DataSourceBadge hospital={l.facility_name} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
