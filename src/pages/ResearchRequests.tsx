import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Inbox, Check, X, Eye } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  purpose: string;
  status: string;
  date_from: string;
  date_to: string;
  requested_facility_ids: string[];
  created_by: string;
  submitted_at: string | null;
  created_at: string;
  carevault_notes: string | null;
  carevault_decision: string | null;
}

interface FacilityDecision {
  id: string;
  project_id: string;
  facility_id: string;
  status: string;
  decision_notes: string | null;
}

export default function ResearchRequests() {
  const { user, isCareVaultAdmin, isFacilityAdmin, facilityId } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [decisions, setDecisions] = useState<FacilityDecision[]>([]);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Project | null>(null);
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: ps } = await supabase
      .from("research_projects")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    setProjects(ps || []);
    if (ps?.length) {
      const { data: ds } = await supabase
        .from("research_project_facilities")
        .select("*")
        .in("project_id", ps.map((p) => p.id));
      setDecisions(ds || []);
    }
    const { data: fs } = await supabase.from("facilities").select("id, name");
    setFacilities(fs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name || "Unknown";

  // CareVault stage 1
  const carevaultDecide = async (p: Project, decision: "approved" | "rejected") => {
    if (!user) return;
    setWorking(true);
    const updates: any = {
      carevault_decision: decision,
      carevault_notes: notes || null,
      carevault_decided_by: user.id,
      carevault_decided_at: new Date().toISOString(),
    };
    if (decision === "rejected") {
      updates.status = "rejected";
    } else {
      updates.status = "pending_facilities";
      // Create facility decision rows
      await supabase.from("research_project_facilities").insert(
        p.requested_facility_ids.map((fid) => ({
          project_id: p.id, facility_id: fid, status: "pending",
        }))
      );
    }
    await supabase.from("research_projects").update(updates).eq("id", p.id);
    await supabase.from("research_project_audit").insert({
      project_id: p.id, actor_id: user.id, action: `carevault_${decision}`,
      details: { notes },
    });
    setWorking(false);
    setActive(null); setNotes("");
    toast({ title: `Project ${decision}` });
    load();
  };

  // Facility stage 2
  const facilityDecide = async (p: Project, decision: "approved" | "rejected") => {
    if (!user || !facilityId) return;
    setWorking(true);
    const row = decisions.find((d) => d.project_id === p.id && d.facility_id === facilityId);
    if (!row) { setWorking(false); return; }
    await supabase.from("research_project_facilities").update({
      status: decision,
      decision_notes: notes || null,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    }).eq("id", row.id);

    // Check if all facility decisions complete → set project status
    const { data: allDecisions } = await supabase
      .from("research_project_facilities")
      .select("status")
      .eq("project_id", p.id);
    if (allDecisions && allDecisions.every((d) => d.status !== "pending")) {
      const anyApproved = allDecisions.some((d) => d.status === "approved");
      await supabase.from("research_projects").update({
        status: anyApproved ? "approved" : "rejected",
      }).eq("id", p.id);
    }
    await supabase.from("research_project_audit").insert({
      project_id: p.id, actor_id: user.id, action: `facility_${decision}`,
      details: { facility_id: facilityId, notes },
    });
    setWorking(false);
    setActive(null); setNotes("");
    toast({ title: `Facility decision recorded: ${decision}` });
    load();
  };

  const cvPending = projects.filter((p) => p.status === "pending_carevault");
  const facilityPending = projects.filter((p) =>
    p.status === "pending_facilities" &&
    decisions.some((d) => d.project_id === p.id && d.facility_id === facilityId && d.status === "pending")
  );
  const decided = projects.filter((p) => ["approved", "rejected", "completed"].includes(p.status));

  const renderCard = (p: Project, stage: "carevault" | "facility" | "decided") => {
    const projDecisions = decisions.filter((d) => d.project_id === p.id);
    return (
      <div key={p.id} className="elevated-card rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>📅 {p.date_from} → {p.date_to}</span>
              <span>🏥 {p.requested_facility_ids.length} facilities requested</span>
              {p.submitted_at && <span>Submitted {new Date(p.submitted_at).toLocaleDateString()}</span>}
            </div>
            {projDecisions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {projDecisions.map((d) => (
                  <Badge key={d.id} variant="outline" className={`text-[10px] ${
                    d.status === "approved" ? "border-success/40 text-success"
                    : d.status === "rejected" ? "border-destructive/40 text-destructive"
                    : "border-warning/40 text-warning"
                  }`}>{facilityName(d.facility_id)}: {d.status}</Badge>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => { setActive(p); setNotes(""); }}>
            <Eye size={14} /> Review
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Research Requests</h1>
        <p className="text-sm text-muted-foreground">
          {isCareVaultAdmin ? "Review research project requests across all facilities."
            : "Approve or reject research access for your facility."}
        </p>
      </div>

      <Tabs defaultValue={isCareVaultAdmin ? "cv" : "facility"}>
        <TabsList>
          {isCareVaultAdmin && <TabsTrigger value="cv">CareVault Review ({cvPending.length})</TabsTrigger>}
          {isFacilityAdmin && <TabsTrigger value="facility">My Facility ({facilityPending.length})</TabsTrigger>}
          <TabsTrigger value="decided">Decided ({decided.length})</TabsTrigger>
        </TabsList>

        {isCareVaultAdmin && (
          <TabsContent value="cv" className="space-y-3 mt-4">
            {loading ? <Loader2 className="animate-spin text-primary mx-auto my-12" />
              : cvPending.length === 0 ? <EmptyState text="No projects awaiting CareVault review" />
              : cvPending.map((p) => renderCard(p, "carevault"))}
          </TabsContent>
        )}

        {isFacilityAdmin && (
          <TabsContent value="facility" className="space-y-3 mt-4">
            {loading ? <Loader2 className="animate-spin text-primary mx-auto my-12" />
              : facilityPending.length === 0 ? <EmptyState text="No requests for your facility" />
              : facilityPending.map((p) => renderCard(p, "facility"))}
          </TabsContent>
        )}

        <TabsContent value="decided" className="space-y-3 mt-4">
          {loading ? <Loader2 className="animate-spin text-primary mx-auto my-12" />
            : decided.length === 0 ? <EmptyState text="No decisions yet" />
            : decided.map((p) => renderCard(p, "decided"))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {active && (() => {
            const inCvStage = isCareVaultAdmin && active.status === "pending_carevault";
            const myFacilityRow = decisions.find((d) =>
              d.project_id === active.id && d.facility_id === facilityId);
            const inFacilityStage = isFacilityAdmin && active.status === "pending_facilities"
              && myFacilityRow?.status === "pending";
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{active.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm pt-2">
                  <Section label="Description">{active.description}</Section>
                  <Section label="Public Health Purpose">{active.purpose}</Section>
                  <div className="grid grid-cols-2 gap-3">
                    <Section label="Date Range">{active.date_from} → {active.date_to}</Section>
                    <Section label="Status">
                      <Badge variant="outline">{active.status}</Badge>
                    </Section>
                  </div>
                  <Section label={`Requested Facilities (${active.requested_facility_ids.length})`}>
                    <div className="flex flex-wrap gap-1">
                      {active.requested_facility_ids.map((fid) => (
                        <Badge key={fid} variant="outline" className="text-xs">{facilityName(fid)}</Badge>
                      ))}
                    </div>
                  </Section>
                  {active.carevault_notes && (
                    <Section label="CareVault Notes">{active.carevault_notes}</Section>
                  )}

                  {(inCvStage || inFacilityStage) && (
                    <>
                      <div className="space-y-1.5">
                        <Textarea rows={3} placeholder="Decision notes (optional)"
                          value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => inCvStage
                          ? carevaultDecide(active, "approved")
                          : facilityDecide(active, "approved")}
                          disabled={working} className="flex-1">
                          <Check size={14} /> Approve
                        </Button>
                        <Button onClick={() => inCvStage
                          ? carevaultDecide(active, "rejected")
                          : facilityDecide(active, "rejected")}
                          disabled={working} variant="destructive" className="flex-1">
                          <X size={14} /> Reject
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <div className="text-foreground">{children}</div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="elevated-card rounded-xl p-12 text-center">
    <Inbox size={32} className="mx-auto text-muted-foreground" />
    <p className="mt-3 text-sm text-muted-foreground">{text}</p>
  </div>
);
