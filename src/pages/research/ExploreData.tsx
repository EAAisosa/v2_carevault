import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Database, Download, Lock } from "lucide-react";

interface DeIdRow {
  research_id: string;
  age_band: string;
  gender: string;
  state: string;
  blood_group: string | null;
  genotype: string | null;
  facility_id: string;
  registered_on: string;
}

export default function ExploreData() {
  const [rows, setRows] = useState<DeIdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ age: "all", gender: "all", state: "all", genotype: "all" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patients_deidentified" as any)
        .select("*")
        .limit(1000);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    (filters.age === "all" || r.age_band === filters.age) &&
    (filters.gender === "all" || r.gender === filters.gender) &&
    (filters.state === "all" || r.state === filters.state) &&
    (filters.genotype === "all" || r.genotype === filters.genotype)
  ), [rows, filters]);

  const states = useMemo(() => Array.from(new Set(rows.map((r) => r.state).filter(Boolean))).sort(), [rows]);
  const genotypes = useMemo(() => Array.from(new Set(rows.map((r) => r.genotype).filter(Boolean))).sort(), [rows]);
  const ageBands = ["<18", "18-29", "30-39", "40-49", "50-59", "60-69", "70+"];

  const exportCsv = () => {
    const header = ["research_id", "age_band", "gender", "state", "blood_group", "genotype", "registered_on"];
    const csv = [header.join(",")].concat(
      filtered.map((r) => header.map((h) => (r as any)[h] ?? "").join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `carevault-deidentified-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Explore De-identified Data</h1>
        <p className="text-sm text-muted-foreground">
          Patients accessible through your approved research projects. Showing up to 1,000 rows.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2 text-xs">
        <Lock size={14} className="text-primary mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">
          <strong className="text-foreground">HIPAA Safe Harbor:</strong> all direct identifiers stripped.
          Re-identification attempts violate the data use agreement.
        </span>
      </div>

      <div className="elevated-card rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Age Band</Label>
            <Select value={filters.age} onValueChange={(v) => setFilters((f) => ({ ...f, age: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ageBands.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gender</Label>
            <Select value={filters.gender} onValueChange={(v) => setFilters((f) => ({ ...f, gender: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <Select value={filters.state} onValueChange={(v) => setFilters((f) => ({ ...f, state: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Genotype</Label>
            <Select value={filters.genotype} onValueChange={(v) => setFilters((f) => ({ ...f, genotype: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {genotypes.map((g) => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <Database size={14} className="inline -mt-0.5 mr-1" />
            <strong className="text-foreground">{filtered.length}</strong> records match
          </p>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No records accessible. Submit a project request and wait for approval.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Research ID</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Genotype</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((r) => (
                <TableRow key={r.research_id}>
                  <TableCell className="font-mono text-xs">{r.research_id.slice(0, 12)}…</TableCell>
                  <TableCell>{r.age_band}</TableCell>
                  <TableCell>{r.gender}</TableCell>
                  <TableCell>{r.state}</TableCell>
                  <TableCell>{r.blood_group || "—"}</TableCell>
                  <TableCell>{r.genotype || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.registered_on}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {filtered.length > 200 && (
          <p className="text-xs text-muted-foreground text-center py-3 border-t">
            Showing first 200 rows. Export CSV for the full {filtered.length} rows.
          </p>
        )}
      </div>
    </div>
  );
}
