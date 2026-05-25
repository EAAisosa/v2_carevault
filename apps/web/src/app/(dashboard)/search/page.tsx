"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import type { Patient } from "@repo/types";

interface PatientResult extends Patient {
  facilityName?: string;
  matchConfidence?: number;
}

export default function PatientSearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"nin" | "demographics">("nin");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoFields, setDemoFields] = useState({ firstName: "", lastName: "", dob: "", phone: "", gender: "" });
  const router = useRouter();
  const api = useApi();

  const buildQuery = () => {
    if (searchType === "nin") return `?q=${encodeURIComponent(query)}`;
    const params = new URLSearchParams();
    if (demoFields.firstName) params.set("firstName", demoFields.firstName);
    if (demoFields.lastName) params.set("lastName", demoFields.lastName);
    if (demoFields.dob) params.set("dob", demoFields.dob);
    if (demoFields.phone) params.set("phone", demoFields.phone);
    if (demoFields.gender) params.set("gender", demoFields.gender);
    return `?${params.toString()}`;
  };

  const handleSearch = async () => {
    setSearched(true);
    setLoading(true);
    try {
      const data = await api.get<{ records: PatientResult[] }>(`/patients${buildQuery()}`);
      setResults(data.records);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Search</h1>
        <p className="text-sm text-muted-foreground">Search the national health records by NIN or demographics</p>
      </div>

      <div className="flex gap-2">
        <Button variant={searchType === "nin" ? "default" : "outline"} size="sm" onClick={() => setSearchType("nin")}>
          Search by NIN
        </Button>
        <Button variant={searchType === "demographics" ? "default" : "outline"} size="sm" onClick={() => setSearchType("demographics")}>
          Search by Demographics
        </Button>
      </div>

      <div className="elevated-card rounded-xl p-5">
        {searchType === "nin" ? (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter 11-digit NIN (e.g., 12345678901)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="First Name" value={demoFields.firstName} onChange={(e) => setDemoFields({ ...demoFields, firstName: e.target.value })} />
              <Input placeholder="Last Name" value={demoFields.lastName} onChange={(e) => setDemoFields({ ...demoFields, lastName: e.target.value })} />
              <Input type="date" placeholder="Date of Birth" value={demoFields.dob} onChange={(e) => setDemoFields({ ...demoFields, dob: e.target.value })} />
              <Input placeholder="Phone Number" value={demoFields.phone} onChange={(e) => setDemoFields({ ...demoFields, phone: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={demoFields.gender}
                onChange={(e) => setDemoFields({ ...demoFields, gender: e.target.value })}
              >
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle size={12} />
              Probabilistic matching requires at least 2 matching fields. Results show confidence scores.
            </p>
          </div>
        )}
      </div>

      {searched && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-sm text-muted-foreground">
            {loading ? "Searching…" : `${results.length} result${results.length !== 1 ? "s" : ""} found`}
          </p>
          {!loading && results.length === 0 ? (
            <div className="elevated-card rounded-xl p-8 text-center">
              <User size={40} className="mx-auto text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-foreground">No patient found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Patient may not be registered in CareVault.
              </p>
            </div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/patient/${p.id}`)}
                className="w-full elevated-card rounded-xl p-5 text-left transition-all hover:shadow-lg hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-foreground">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">NIN: {p.nin}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{p.gender === "Male" ? "♂" : "♀"} {p.gender}</span>
                      <span>DOB: {p.dateOfBirth}</span>
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.bloodGroup && <span>🩸 {p.bloodGroup} / {p.genotype}</span>}
                    </div>
                    {p.lga && <p className="mt-1 text-xs text-muted-foreground">{p.lga}, {p.state}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {p.matchConfidence && (
                      <span className={`text-xs font-bold ${p.matchConfidence >= 90 ? "text-success" : "text-warning"}`}>
                        {p.matchConfidence}% match
                      </span>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">Registered at</p>
                    <p className="text-xs font-medium text-foreground">{p.facilityName ?? "—"}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
