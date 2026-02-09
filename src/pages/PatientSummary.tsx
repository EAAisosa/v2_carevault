import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import { patients, encounters, vitals, medications, allergies, labResults } from "@/data/mockData";
import PatientTimeline from "@/components/PatientTimeline";
import VitalsChart from "@/components/VitalsChart";
import DataSourceBadge from "@/components/DataSourceBadge";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PatientSummary() {
  const { id } = useParams();
  const patient = patients.find((p) => p.id === id) || patients[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/search" className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{patient.firstName} {patient.lastName}</h1>
            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Shield size={10} /> Read-Only
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">NIN: {patient.nin}</span>
            <span>{patient.gender === "male" ? "♂ Male" : "♀ Female"}</span>
            <span>DOB: {patient.dateOfBirth}</span>
            <span>🩸 {patient.bloodGroup} / {patient.genotype}</span>
            <span>📞 {patient.phone}</span>
          </div>
        </div>
      </div>

      {/* Alert banner for allergies */}
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <AlertTriangle size={16} className="text-destructive flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-destructive">Known Allergies</p>
          <p className="text-xs text-foreground">
            {allergies.map((a) => `${a.substance} (${a.severity})`).join(" • ")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <PatientTimeline encounters={encounters} />
        </TabsContent>

        <TabsContent value="vitals">
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
                {vitals.map((v, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{v.date}</td>
                    <td className="px-4 py-3 font-semibold">{v.systolic}/{v.diastolic}</td>
                    <td className="px-4 py-3">{v.heartRate} bpm</td>
                    <td className="px-4 py-3">{v.temperature}°C</td>
                    <td className="px-4 py-3">{v.weight} kg</td>
                    <td className="px-4 py-3">{v.spO2}%</td>
                    <td className="px-4 py-3"><DataSourceBadge hospital={v.hospital} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="medications">
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
                {medications.map((m, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                    <td className="px-4 py-3 font-mono">{m.dosage}</td>
                    <td className="px-4 py-3">{m.frequency}</td>
                    <td className="px-4 py-3">{m.prescribedBy}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{m.startDate}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3"><DataSourceBadge hospital={m.hospital} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="allergies">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allergies.map((a, i) => (
              <div key={i} className="elevated-card rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{a.substance}</h4>
                  <StatusBadge status={a.severity} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Reaction: {a.reaction}</p>
                <p className="mt-1 text-xs text-muted-foreground">Reported by {a.reportedBy}</p>
                <p className="mt-1 text-xs text-muted-foreground font-mono">{a.dateRecorded}</p>
                <div className="mt-3">
                  <DataSourceBadge hospital={a.hospital} />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="labs">
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
                {labResults.map((l, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{l.test}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{l.result} {l.unit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.referenceRange}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{l.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3"><DataSourceBadge hospital={l.hospital} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
