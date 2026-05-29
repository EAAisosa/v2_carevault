"use client";

import { useState } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { useFacilities, useCreateFacility, useUpdateFacilityStatus } from "@/api/facilities";
import { toast } from "sonner";
import type { FacilityStatus } from "@repo/types";

export default function FacilitiesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", state: "", facilityCode: "", ehrSystem: "" });

  const query = useFacilities();
  const facilities = query.data ?? [];
  const loading = query.isPending;

  const createMutation = useCreateFacility();
  const statusMutation = useUpdateFacilityStatus();

  const handleCreate = () => {
    if (!form.name || !form.location || !form.state) {
      toast.error("Name, location and state are required");
      return;
    }
    createMutation.mutate(form, {
      onSuccess: () => {
        toast.success("Facility created");
        setAddOpen(false);
        setForm({ name: "", location: "", state: "", facilityCode: "", ehrSystem: "" });
      },
      onError: (err) => toast.error(err.message || "Failed to create facility"),
    });
  };

  const handleStatusChange = (id: string, status: FacilityStatus) => {
    statusMutation.mutate({ id, status }, {
      onError: () => toast.error("Failed to update facility status"),
    });
  };

  const saving = createMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facilities</h1>
          <p className="text-sm text-muted-foreground">Connected hospitals and EHR systems</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} /> Add Facility</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Facility</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Lagos University Teaching Hospital" /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Idi-Araba, Lagos" /></div>
              <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="Lagos" /></div>
              <div className="space-y-2"><Label>Facility Code (optional)</Label><Input value={form.facilityCode} onChange={(e) => setForm((f) => ({ ...f, facilityCode: e.target.value }))} placeholder="LUTH-001" /></div>
              <div className="space-y-2"><Label>EHR System (optional)</Label><Input value={form.ehrSystem} onChange={(e) => setForm((f) => ({ ...f, ehrSystem: e.target.value }))} placeholder="OpenMRS, Bahmni, DHIS2" /></div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving && <Loader2 size={14} className="animate-spin" />} Create Facility
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : facilities.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Building2 size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No facilities connected</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {facilities.map((f) => (
            <div key={f.id} className="elevated-card rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.location}, {f.state}</p>
                </div>
                <StatusBadge status={f.status} />
              </div>
              {f.ehrSystem && <p className="text-xs text-muted-foreground">EHR: {f.ehrSystem}</p>}
              {f.facilityCode && <p className="text-xs font-mono text-muted-foreground">Code: {f.facilityCode}</p>}
              <div className="pt-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Change Status</Label>
                <Select value={f.status} onValueChange={(v) => handleStatusChange(f.id, v as FacilityStatus)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="degraded">Degraded</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
