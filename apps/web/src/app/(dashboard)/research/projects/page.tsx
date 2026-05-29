"use client";

import { useState } from "react";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import { useMyResearchProjects, useCreateResearchProject } from "@/api/research";
import { toast } from "sonner";

export default function MyProjectsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", principalInvestigator: "", dataCategories: "" });

  const query = useMyResearchProjects();
  const projects = query.data ?? [];
  const loading = query.isPending;

  const createMutation = useCreateResearchProject();
  const saving = createMutation.isPending;

  const handleCreate = () => {
    createMutation.mutate(
      {
        ...form,
        dataCategories: form.dataCategories.split(",").map((s) => s.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setForm({ title: "", description: "", principalInvestigator: "", dataCategories: "" });
          toast.success("Research project submitted for review");
        },
        onError: (err) => toast.error(err.message || "Failed to submit project"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
          <p className="text-sm text-muted-foreground">Your submitted research projects</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Research Project</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Project Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Principal Investigator</Label><Input value={form.principalInvestigator} onChange={(e) => setForm((f) => ({ ...f, principalInvestigator: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Data Categories (comma-separated)</Label><Input value={form.dataCategories} onChange={(e) => setForm((f) => ({ ...f, dataCategories: e.target.value }))} placeholder="encounters, vitals, lab_results" /></div>
              <Button onClick={handleCreate} disabled={saving || !form.title || !form.principalInvestigator} className="w-full">
                {saving && <Loader2 size={14} className="animate-spin" />} Submit for Review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Submit a new research project to request data access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="elevated-card rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">PI: {p.createdBy}</p>
                  {p.description && <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{p.description}</p>}
                </div>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
