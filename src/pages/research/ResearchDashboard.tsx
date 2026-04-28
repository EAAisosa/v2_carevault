import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, Database, FlaskConical, Lock } from "lucide-react";
import StatsCard from "@/components/StatsCard";

export default function ResearchDashboard() {
  const { fullName } = useAuth();
  const [stats, setStats] = useState({ approved: 0, pending: 0, accessibleRecords: 0 });

  useEffect(() => {
    (async () => {
      const { data: projects } = await supabase
        .from("research_projects")
        .select("id, status");
      const approved = (projects || []).filter((p) => p.status === "approved").length;
      const pending = (projects || []).filter((p) =>
        ["pending_carevault", "pending_facilities"].includes(p.status)
      ).length;
      const { count } = await supabase
        .from("patients_deidentified" as any)
        .select("*", { count: "exact", head: true });
      setStats({ approved, pending, accessibleRecords: count || 0 });
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Research Portal</h1>
        <p className="text-sm text-muted-foreground">
          Welcome{fullName ? `, ${fullName}` : ""}. All data is de-identified per HIPAA Safe Harbor.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Lock size={18} className="text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground">De-identified, read-only access</p>
          <p className="text-muted-foreground mt-0.5">
            Names, NIN, phone numbers, exact dates of birth, and addresses are stripped. You see age bands,
            gender, state, blood group, and genotype only — for facilities and date ranges your project has been
            approved to access.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Approved Projects" value={stats.approved} icon={<FlaskConical size={20} />} />
        <StatsCard label="Awaiting Approval" value={stats.pending} icon={<ClipboardList size={20} />} />
        <StatsCard
          label="Accessible Records"
          value={stats.accessibleRecords.toLocaleString()}
          icon={<Database size={20} />}
          trend="De-identified"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/research/projects" className="elevated-card rounded-xl p-5 hover:bg-muted/30 transition-colors">
          <ClipboardList size={20} className="text-primary mb-2" />
          <h3 className="text-sm font-semibold text-foreground">My Projects</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Submit new project requests, track approvals, and manage active studies.
          </p>
        </Link>
        <Link to="/research/explore" className="elevated-card rounded-xl p-5 hover:bg-muted/30 transition-colors">
          <Database size={20} className="text-primary mb-2" />
          <h3 className="text-sm font-semibold text-foreground">Explore De-identified Data</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Query the cohort for your approved projects. Download aggregates only.
          </p>
        </Link>
      </div>
    </div>
  );
}
