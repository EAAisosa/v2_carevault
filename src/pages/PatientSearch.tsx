import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { patients } from "@/data/mockData";
import type { Patient } from "@/data/mockData";

export default function PatientSearch() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"nin" | "demographics">("nin");
  const [results, setResults] = useState<Patient[]>([]);
  const [searched, setSearched] = useState(false);
  const [demoFields, setDemoFields] = useState({ firstName: "", lastName: "", dob: "", phone: "", gender: "" });
  const navigate = useNavigate();

  const handleSearch = () => {
    setSearched(true);
    if (searchType === "nin") {
      setResults(patients.filter((p) => p.nin.includes(query)));
    } else {
      setResults(
        patients.filter((p) => {
          let score = 0;
          if (demoFields.firstName && p.firstName.toLowerCase().includes(demoFields.firstName.toLowerCase())) score++;
          if (demoFields.lastName && p.lastName.toLowerCase().includes(demoFields.lastName.toLowerCase())) score++;
          if (demoFields.dob && p.dateOfBirth === demoFields.dob) score++;
          if (demoFields.phone && p.phone.includes(demoFields.phone)) score++;
          if (demoFields.gender && p.gender === demoFields.gender) score++;
          return score >= 2;
        }).map((p) => ({ ...p, matchConfidence: 85 + Math.floor(Math.random() * 15) }))
      );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Search</h1>
        <p className="text-sm text-muted-foreground">Search the national health records by NIN or demographics</p>
      </div>

      {/* Search type toggle */}
      <div className="flex gap-2">
        <Button
          variant={searchType === "nin" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchType("nin")}
        >
          Search by NIN
        </Button>
        <Button
          variant={searchType === "demographics" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchType("demographics")}
        >
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
            <Button onClick={handleSearch}>Search</Button>
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
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <Button onClick={handleSearch}>Search</Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle size={12} />
              Probabilistic matching requires at least 2 matching fields. Results show confidence scores.
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.length === 0 ? (
            <div className="elevated-card rounded-xl p-8 text-center">
              <User size={40} className="mx-auto text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-foreground">No patient found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Patient may not be registered in NHRIRP. Consider registering locally with a new NIN link.
              </p>
            </div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/patient/${p.id}`)}
                className="w-full elevated-card rounded-xl p-5 text-left transition-all hover:shadow-lg hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-foreground">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">NIN: {p.nin}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{p.gender === "male" ? "♂" : "♀"} {p.gender}</span>
                      <span>DOB: {p.dateOfBirth}</span>
                      <span>📞 {p.phone}</span>
                      <span>🩸 {p.bloodGroup} / {p.genotype}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.address}, {p.state}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {p.matchConfidence && (
                      <span className={`text-xs font-bold ${p.matchConfidence >= 90 ? "text-success" : "text-warning"}`}>
                        {p.matchConfidence}% match
                      </span>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">Registered at</p>
                    <p className="text-xs font-medium text-foreground">{p.registeredHospital}</p>
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
