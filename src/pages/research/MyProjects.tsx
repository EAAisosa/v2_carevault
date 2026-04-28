import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Send, Trash2, FlaskConical } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  purpose: string;
  status: string;
  date_from: string;
  date_to: string;
  requested_facility_ids: string[];
  submitted_at: string | null;
  created_at: string;
  carevault_notes: string | null;
}

interface Facility { id: string; name: string; state: string }
interface FacilityDecision { project_id: string; facility_id: string; status: string; decision_notes: string | null }

const statusVariant = (s: string): { label: string; cls: string } => {
  switch (s) {
    case "draft": return { label: "Draft", cls: "bg-muted text-muted-foreground" };
    case "pending_carevault": return { label: "Pending CareVault Review", cls: "bg-warning/15 text-warning border border-warning/30" };
    case "pending_facilities": return { label: "Pending Facility Approvals", cls: "bg-warning/15 text-warning border border-warning/30" };
    case "approved": return { label: "Approved", cls: "bg-success/15 text-success border border-success/30" };
    case "rejected": return { label: "Rejected", cls: "bg-destructive/15 text-destructive border border-destructive/30" };
    case "completed": return { label: "Completed", cls: "bg-muted text-muted-foreground" };
    default: return { label: s, cls: "bg-muted text-muted-foreground" };
  }
};

export default function MyProjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [decisions, setDecisions] = useState<FacilityDecision[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", purpose: "", date_from: "", date_to: "",
    facility_ids: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    const { data: ps } = await supabase
      .from("research_projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects(ps || []);
    if (ps && ps.length) {
      const { data: ds } = await supabase
        .from("research_project_facilities")
        .select("project_id, facility_id, status, decision_notes")
        .in("project_id", ps.map((p) => p.id));
      setDecisions(ds || []);
    }
    const { data: fs } = await supabase.from("facilities").select("id, name, state").order("name");
    setFacilities(fs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    if (!form.title || !form.description || !form.purpose || !form.date_from || !form.date_to || form.facility_ids.length === 0) {
      toast({ title: "Missing fields", description: "Fill all fields and select at least one facility.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("research_projects").insert({
      title: form.title,
      description: form.description,
      purpose: form.purpose,
      date_from: form.date_from,
      date_to: form.date_to,
      requested_facility_ids: form.facility_ids,
      status: "draft",
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Project created", description: "Saved as draft. Submit when ready." });
    setOpen(false);
    setForm({ title: "", description: "", purpose: "", date_from: "", date_to: "", facility_ids: [] });
    load();
  };

  const submit = async (p: Project) => {
    // Move to pending_carevault and create facility decision rows
    const { error } = await supabase.from("research_projects").update({
      status: "pending_carevault",
      submitted_at: new Date().toISOString(),
    }).eq("id", p.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (user) {
      await supabase.from("research_project_audit").insert({
        project_id: p.id, actor_id: user.id, action: "submitted",
      });
    }
    toast({ title: "Submitted for review" });
    load();
  };

  const del = async (p: Project) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await supabase.from("research_projects").delete().eq("id", p.id);
    load();
  };

  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name || "Unknown";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Research Projects</h1>
          <p className="text-sm text-muted-foreground">Submit data access requests and track approvals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} /> New Project Request</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Research Project Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Project Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Sickle cell prevalence in Northern Nigeria, 2023-2024" />
              </div>
              <div className="space-y-2">
                <Label>Research Question / Description</Label>
                <Textarea rows={3} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What you intend to study, methodology, expected outputs..." />
              </div>
              <div className="space-y-2">
                <Label>Purpose / Public Health Justification</Label>
                <Textarea rows={2} value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  placeholder="How will this benefit Nigerian public health?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data From</Label>
                  <Input type="date" value={form.date_from}
                    onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data To</Label>
                  <Input type="date" value={form.date_to}
                    onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Requested Facilities ({form.facility_ids.length} selected)</Label>
                <div className="rounded-lg border max-h-48 overflow-y-auto p-2 space-y-1">
                  {facilities.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={form.facility_ids.includes(f.id)}
                        onCheckedChange={(c) => setForm((p) => ({
                          ...p,
                          facility_ids: c
                            ? [...p.facility_ids, f.id]
                            : p.facility_ids.filter((x) => x !== f.id),
                        }))}
                      />
                      <span className="text-sm">{f.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{f.state}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={create} disabled={saving} className="w-full">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <FlaskConical size={32} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New Project Request" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const v = statusVariant(p.status);
            const projDecisions = decisions.filter((d) => d.project_id === p.id);
            return (
              <div key={p.id} className="elevated-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
                      <Badge className={`${v.cls} text-xs`}>{v.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{p.description}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>📅 {p.date_from} → {p.date_to}</span>
                      <span>🏥 {p.requested_facility_ids.length} facilities</span>
                      <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    {p.carevault_notes && (
                      <p className="mt-2 text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                        CareVault note: {p.carevault_notes}
                      </p>
                    )}
                    {projDecisions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {projDecisions.map((d) => (
                          <span key={d.facility_id}
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              d.status === "approved" ? "bg-success/10 text-success border-success/30"
                              : d.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30"
                              : "bg-warning/10 text-warning border-warning/30"
                            }`}>
                            {facilityName(d.facility_id)}: {d.status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {p.status === "draft" && (
                      <>
                        <Button size="sm" onClick={() => submit(p)}><Send size={14} /> Submit</Button>
                        <Button size="sm" variant="ghost" onClick={() => del(p)}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
