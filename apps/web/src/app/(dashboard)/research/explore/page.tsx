"use client";

import { useState } from "react";
import { Database, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";

const DATA_CATEGORIES = ["encounters", "vitals", "medications", "lab_results", "allergies"];

export default function ExploreDataPage() {
  const api = useApi();
  const [category, setCategory] = useState("encounters");
  const [results, setResults] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const handleQuery = async () => {
    setLoading(true);
    setQueried(true);
    try {
      const data = await api.get<{ records: unknown[] }>(`/research/data?category=${category}`);
      setResults(data.records);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Explore Data</h1>
        <p className="text-sm text-muted-foreground">Query de-identified patient data for approved research projects</p>
      </div>

      <div className="elevated-card rounded-xl p-5 space-y-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label>Data Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleQuery} disabled={loading} className="gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Query
          </Button>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Database size={12} />
          Data is de-identified — no patient names, NINs, or direct identifiers are returned.
        </p>
      </div>

      {queried && (
        <div className="animate-slide-up">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
              No data found for this category. You may need an approved research project that covers this data type.
            </div>
          ) : (
            <div className="elevated-card rounded-xl overflow-hidden">
              <pre className="p-4 text-xs font-mono text-foreground/80 overflow-auto max-h-[60vh]">
                {JSON.stringify(results.slice(0, 20), null, 2)}
              </pre>
              {results.length > 20 && (
                <p className="px-4 pb-3 text-xs text-muted-foreground">Showing first 20 of {results.length} records.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
