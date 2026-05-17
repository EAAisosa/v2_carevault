import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Database, Download, Lock } from "lucide-react";

interface DemoRow {
  research_id: string;
  age_band: string;
  gender: string;
  state: string;
  blood_group: string | null;
  genotype: string | null;
  registered_on: string;
}

interface EncounterRow {
  research_id: string;
  age_band: string;
  gender: string;
  state: string;
  blood_group: string | null;
  genotype: string | null;
  diagnosis: string;
  encounter_type: string;
  encounter_status: string;
  encounter_month: string;
}

interface LabRow {
  research_id: string;
  age_band: string;
  gender: string;
  state: string;
  test: string;
  result: string;
  unit: string | null;
  reference_range: string | null;
  lab_status: string;
  result_month: string;
}

interface MedRow {
  research_id: string;
  age_band: string;
  gender: string;
  state: string;
  drug_name: string;
  drug_status: string;
  start_month: string;
}

const AGE_BANDS = ["<18", "18-29", "30-39", "40-49", "50-59", "60-69", "70+"];

function csvDownload(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  const csv = [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")))
    .join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function FilterBar({
  ageBands, genders, states, filters, onChange,
}: {
  ageBands: string[];
  genders: string[];
  states: string[];
  filters: { age: string; gender: string; state: string };
  onChange: (f: { age: string; gender: string; state: string }) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Age Band</Label>
        <Select value={filters.age} onValueChange={(v) => onChange({ ...filters, age: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {ageBands.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Gender</Label>
        <Select value={filters.gender} onValueChange={(v) => onChange({ ...filters, gender: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {genders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">State</Label>
        <Select value={filters.state} onValueChange={(v) => onChange({ ...filters, state: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ResultBar({ count, onExport }: { count: number; onExport: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        <Database size={14} className="inline -mt-0.5 mr-1" />
        <strong className="text-foreground">{count}</strong> records match
      </p>
      <Button size="sm" variant="outline" onClick={onExport} disabled={!count}>
        <Download size={14} /> Export CSV
      </Button>
    </div>
  );
}

const labStatusColors: Record<string, string> = {
  normal: "bg-success/10 text-success border-success/30",
  abnormal: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function ExploreData() {
  const [demo, setDemo] = useState<DemoRow[]>([]);
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [meds, setMeds] = useState<MedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [demoFilters, setDemoFilters] = useState({ age: "all", gender: "all", state: "all", genotype: "all" });
  const [encFilters, setEncFilters] = useState({ age: "all", gender: "all", state: "all", diagSearch: "" });
  const [labFilters, setLabFilters] = useState({ age: "all", gender: "all", state: "all", testSearch: "", status: "all" });
  const [medFilters, setMedFilters] = useState({ age: "all", gender: "all", state: "all", drugSearch: "" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [d, e, l, m] = await Promise.all([
        supabase.from("patients_deidentified" as any).select("*").limit(1000),
        supabase.from("encounters_deidentified" as any).select("*").limit(2000),
        supabase.from("lab_results_deidentified" as any).select("*").limit(2000),
        supabase.from("medications_deidentified" as any).select("*").limit(2000),
      ]);
      setDemo((d.data as any) || []);
      setEncounters((e.data as any) || []);
      setLabs((l.data as any) || []);
      setMeds((m.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const demoStates   = useMemo(() => Array.from(new Set(demo.map((r) => r.state))).sort(), [demo]);
  const demoGenders  = useMemo(() => Array.from(new Set(demo.map((r) => r.gender))).sort(), [demo]);
  const demoGenos    = useMemo(() => Array.from(new Set(demo.map((r) => r.genotype).filter(Boolean))).sort(), [demo]);
  const encStates    = useMemo(() => Array.from(new Set(encounters.map((r) => r.state))).sort(), [encounters]);
  const encGenders   = useMemo(() => Array.from(new Set(encounters.map((r) => r.gender))).sort(), [encounters]);
  const labStates    = useMemo(() => Array.from(new Set(labs.map((r) => r.state))).sort(), [labs]);
  const labGenders   = useMemo(() => Array.from(new Set(labs.map((r) => r.gender))).sort(), [labs]);
  const medStates    = useMemo(() => Array.from(new Set(meds.map((r) => r.state))).sort(), [meds]);
  const medGenders   = useMemo(() => Array.from(new Set(meds.map((r) => r.gender))).sort(), [meds]);

  const filteredDemo = useMemo(() => demo.filter((r) =>
    (demoFilters.age === "all" || r.age_band === demoFilters.age) &&
    (demoFilters.gender === "all" || r.gender === demoFilters.gender) &&
    (demoFilters.state === "all" || r.state === demoFilters.state) &&
    (demoFilters.genotype === "all" || r.genotype === demoFilters.genotype)
  ), [demo, demoFilters]);

  const filteredEnc = useMemo(() => encounters.filter((r) =>
    (encFilters.age === "all" || r.age_band === encFilters.age) &&
    (encFilters.gender === "all" || r.gender === encFilters.gender) &&
    (encFilters.state === "all" || r.state === encFilters.state) &&
    (!encFilters.diagSearch || r.diagnosis.toLowerCase().includes(encFilters.diagSearch.toLowerCase()))
  ), [encounters, encFilters]);

  const filteredLabs = useMemo(() => labs.filter((r) =>
    (labFilters.age === "all" || r.age_band === labFilters.age) &&
    (labFilters.gender === "all" || r.gender === labFilters.gender) &&
    (labFilters.state === "all" || r.state === labFilters.state) &&
    (labFilters.status === "all" || r.lab_status === labFilters.status) &&
    (!labFilters.testSearch || r.test.toLowerCase().includes(labFilters.testSearch.toLowerCase()))
  ), [labs, labFilters]);

  const filteredMeds = useMemo(() => meds.filter((r) =>
    (medFilters.age === "all" || r.age_band === medFilters.age) &&
    (medFilters.gender === "all" || r.gender === medFilters.gender) &&
    (medFilters.state === "all" || r.state === medFilters.state) &&
    (!medFilters.drugSearch || r.drug_name.toLowerCase().includes(medFilters.drugSearch.toLowerCase()))
  ), [meds, medFilters]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Explore De-identified Data</h1>
        <p className="text-sm text-muted-foreground">
          Clinical and demographic records from your approved research projects. Showing up to 2,000 rows per domain.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2 text-xs">
        <Lock size={14} className="text-primary mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">
          <strong className="text-foreground">HIPAA Safe Harbor:</strong> names, NIN, phone, and exact birth dates are
          stripped. Only patients from your approved project facilities are shown.
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : (
        <Tabs defaultValue="encounters">
          <TabsList>
            <TabsTrigger value="encounters">
              Diagnoses {encounters.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({encounters.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="labs">
              Lab Results {labs.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({labs.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="medications">
              Medications {meds.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({meds.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="demographics">
              Demographics {demo.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({demo.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Diagnoses / Encounters ─────────────────────────── */}
          <TabsContent value="encounters" className="space-y-4 mt-4">
            <div className="elevated-card rounded-xl p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Search Diagnosis</Label>
                <Input
                  placeholder="e.g. sickle cell, malaria, hypertension…"
                  value={encFilters.diagSearch}
                  onChange={(e) => setEncFilters((f) => ({ ...f, diagSearch: e.target.value }))}
                />
              </div>
              <FilterBar
                ageBands={AGE_BANDS} genders={encGenders} states={encStates}
                filters={encFilters}
                onChange={(f) => setEncFilters((prev) => ({ ...prev, ...f }))}
              />
              <ResultBar
                count={filteredEnc.length}
                onExport={() => csvDownload(
                  `carevault-diagnoses-${Date.now()}.csv`,
                  ["research_id", "age_band", "gender", "state", "blood_group", "genotype", "diagnosis", "encounter_type", "encounter_status", "encounter_month"],
                  filteredEnc
                )}
              />
            </div>
            <DataTable
              empty="No encounter records accessible. Ensure your project is approved and covers at least one facility."
              rows={filteredEnc.slice(0, 200)}
              total={filteredEnc.length}
              headers={["Research ID", "Age", "Gender", "State", "Blood Group", "Genotype", "Diagnosis", "Type", "Status", "Month"]}
              render={(r: EncounterRow) => (
                <TableRow key={`${r.research_id}-${r.encounter_month}-${r.diagnosis}`}>
                  <TableCell className="font-mono text-xs">{r.research_id.slice(0, 12)}…</TableCell>
                  <TableCell>{r.age_band}</TableCell>
                  <TableCell>{r.gender}</TableCell>
                  <TableCell>{r.state}</TableCell>
                  <TableCell>{r.blood_group || "—"}</TableCell>
                  <TableCell>{r.genotype || "—"}</TableCell>
                  <TableCell className="font-medium text-foreground max-w-[220px] truncate" title={r.diagnosis}>{r.diagnosis}</TableCell>
                  <TableCell className="text-xs">{r.encounter_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.encounter_status}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.encounter_month}</TableCell>
                </TableRow>
              )}
            />
          </TabsContent>

          {/* ── Lab Results ────────────────────────────────────── */}
          <TabsContent value="labs" className="space-y-4 mt-4">
            <div className="elevated-card rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Search Test</Label>
                  <Input
                    placeholder="e.g. HbS, CBC, haemoglobin…"
                    value={labFilters.testSearch}
                    onChange={(e) => setLabFilters((f) => ({ ...f, testSearch: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Result Status</Label>
                  <Select value={labFilters.status} onValueChange={(v) => setLabFilters((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="abnormal">Abnormal</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <FilterBar
                ageBands={AGE_BANDS} genders={labGenders} states={labStates}
                filters={labFilters}
                onChange={(f) => setLabFilters((prev) => ({ ...prev, ...f }))}
              />
              <ResultBar
                count={filteredLabs.length}
                onExport={() => csvDownload(
                  `carevault-labs-${Date.now()}.csv`,
                  ["research_id", "age_band", "gender", "state", "test", "result", "unit", "reference_range", "lab_status", "result_month"],
                  filteredLabs
                )}
              />
            </div>
            <DataTable
              empty="No lab results accessible for your approved facilities."
              rows={filteredLabs.slice(0, 200)}
              total={filteredLabs.length}
              headers={["Research ID", "Age", "Gender", "State", "Test", "Result", "Unit", "Ref. Range", "Status", "Month"]}
              render={(r: LabRow) => (
                <TableRow key={`${r.research_id}-${r.result_month}-${r.test}`}>
                  <TableCell className="font-mono text-xs">{r.research_id.slice(0, 12)}…</TableCell>
                  <TableCell>{r.age_band}</TableCell>
                  <TableCell>{r.gender}</TableCell>
                  <TableCell>{r.state}</TableCell>
                  <TableCell className="font-medium text-foreground">{r.test}</TableCell>
                  <TableCell className="font-mono">{r.result}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.unit || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.reference_range || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${labStatusColors[r.lab_status] || ""}`}>
                      {r.lab_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.result_month}</TableCell>
                </TableRow>
              )}
            />
          </TabsContent>

          {/* ── Medications ────────────────────────────────────── */}
          <TabsContent value="medications" className="space-y-4 mt-4">
            <div className="elevated-card rounded-xl p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Search Medication</Label>
                <Input
                  placeholder="e.g. hydroxyurea, folic acid…"
                  value={medFilters.drugSearch}
                  onChange={(e) => setMedFilters((f) => ({ ...f, drugSearch: e.target.value }))}
                />
              </div>
              <FilterBar
                ageBands={AGE_BANDS} genders={medGenders} states={medStates}
                filters={medFilters}
                onChange={(f) => setMedFilters((prev) => ({ ...prev, ...f }))}
              />
              <ResultBar
                count={filteredMeds.length}
                onExport={() => csvDownload(
                  `carevault-medications-${Date.now()}.csv`,
                  ["research_id", "age_band", "gender", "state", "drug_name", "drug_status", "start_month"],
                  filteredMeds
                )}
              />
            </div>
            <DataTable
              empty="No medication records accessible for your approved facilities."
              rows={filteredMeds.slice(0, 200)}
              total={filteredMeds.length}
              headers={["Research ID", "Age", "Gender", "State", "Medication", "Status", "Started"]}
              render={(r: MedRow) => (
                <TableRow key={`${r.research_id}-${r.start_month}-${r.drug_name}`}>
                  <TableCell className="font-mono text-xs">{r.research_id.slice(0, 12)}…</TableCell>
                  <TableCell>{r.age_band}</TableCell>
                  <TableCell>{r.gender}</TableCell>
                  <TableCell>{r.state}</TableCell>
                  <TableCell className="font-medium text-foreground">{r.drug_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.drug_status}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.start_month}</TableCell>
                </TableRow>
              )}
            />
          </TabsContent>

          {/* ── Patient Demographics ───────────────────────────── */}
          <TabsContent value="demographics" className="space-y-4 mt-4">
            <div className="elevated-card rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Age Band</Label>
                  <Select value={demoFilters.age} onValueChange={(v) => setDemoFilters((f) => ({ ...f, age: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {AGE_BANDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <Select value={demoFilters.gender} onValueChange={(v) => setDemoFilters((f) => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {demoGenders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Select value={demoFilters.state} onValueChange={(v) => setDemoFilters((f) => ({ ...f, state: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {demoStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Genotype</Label>
                  <Select value={demoFilters.genotype} onValueChange={(v) => setDemoFilters((f) => ({ ...f, genotype: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {demoGenos.map((g) => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ResultBar
                count={filteredDemo.length}
                onExport={() => csvDownload(
                  `carevault-demographics-${Date.now()}.csv`,
                  ["research_id", "age_band", "gender", "state", "blood_group", "genotype", "registered_on"],
                  filteredDemo
                )}
              />
            </div>
            <DataTable
              empty="No patient records accessible. Submit a project request and wait for approval."
              rows={filteredDemo.slice(0, 200)}
              total={filteredDemo.length}
              headers={["Research ID", "Age", "Gender", "State", "Blood Group", "Genotype", "Registered"]}
              render={(r: DemoRow) => (
                <TableRow key={r.research_id}>
                  <TableCell className="font-mono text-xs">{r.research_id.slice(0, 12)}…</TableCell>
                  <TableCell>{r.age_band}</TableCell>
                  <TableCell>{r.gender}</TableCell>
                  <TableCell>{r.state}</TableCell>
                  <TableCell>{r.blood_group || "—"}</TableCell>
                  <TableCell>{r.genotype || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.registered_on}</TableCell>
                </TableRow>
              )}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DataTable<T>({
  empty, rows, total, headers, render,
}: {
  empty: string;
  rows: T[];
  total: number;
  headers: string[];
  render: (row: T) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">{empty}</div>
    );
  }
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>{rows.map(render)}</TableBody>
      </Table>
      {total > 200 && (
        <p className="text-xs text-muted-foreground text-center py-3 border-t">
          Showing first 200 of {total} rows. Export CSV for the full dataset.
        </p>
      )}
    </div>
  );
}
