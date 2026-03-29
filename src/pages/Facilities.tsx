import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Building2, MapPin, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Facility {
  id: string;
  name: string;
  facility_code: string | null;
  location: string;
  state: string;
  ehr_system: string;
  status: "online" | "degraded" | "offline";
  uptime: number;
  records_count: number;
  last_sync: string | null;
  created_at: string;
}
function SyncButton({ facilityId, onSynced }: { facilityId: string; onSynced: () => void }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("simulate-ehr-sync", {
        body: { facility_id: facilityId },
      });
      if (res.error) throw res.error;
      const result = res.data;
      toast({ title: "EHR Sync Complete", description: `${result.records_synced} records pulled into staging queue.` });
      onSynced();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  return (
    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleSync} disabled={syncing}>
      {syncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} {syncing ? "Syncing…" : "Sync"}
    </Button>
  );
}

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({ name: "", facility_code: "", location: "", state: "", ehr_system: "OpenMRS" });
  const [saving, setSaving] = useState(false);

  const fetchFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error loading facilities", description: error.message, variant: "destructive" });
    } else {
      setFacilities((data as Facility[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFacilities(); }, []);

  const handleAddFacility = async () => {
    if (!newFacility.name || !newFacility.facility_code || !newFacility.location || !newFacility.state) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("facilities").insert({
      name: newFacility.name,
      facility_code: newFacility.facility_code,
      location: newFacility.location,
      state: newFacility.state,
      ehr_system: newFacility.ehr_system,
    });
    if (error) {
      toast({ title: "Error adding facility", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Facility added", description: `${newFacility.name} has been onboarded.` });
      setNewFacility({ name: "", facility_code: "", location: "", state: "", ehr_system: "OpenMRS" });
      setDialogOpen(false);
      fetchFacilities();
    }
    setSaving(false);
  };

  const totalRecords = facilities.reduce((sum, f) => sum + f.records_count, 0);
  const onlineCount = facilities.filter((f) => f.status === "online").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Onboarded Facilities</h1>
          <p className="text-sm text-muted-foreground">Manage hospitals connected to NHRIRP</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus size={14} /> Onboard Facility
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboard New Facility</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Facility ID</Label>
                <Input placeholder="e.g. FMC-ABJ-001" value={newFacility.facility_code} onChange={(e) => setNewFacility({ ...newFacility, facility_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hospital Name</Label>
                <Input placeholder="e.g. Lagos University Teaching Hospital" value={newFacility.name} onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g. Idi-Araba, Lagos" value={newFacility.location} onChange={(e) => setNewFacility({ ...newFacility, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input placeholder="e.g. Lagos" value={newFacility.state} onChange={(e) => setNewFacility({ ...newFacility, state: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>EHR System</Label>
                <Select value={newFacility.ehr_system} onValueChange={(v) => setNewFacility({ ...newFacility, ehr_system: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenMRS">OpenMRS</SelectItem>
                    <SelectItem value="Bahmni">Bahmni</SelectItem>
                    <SelectItem value="DHIS2">DHIS2</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddFacility} disabled={saving} className="w-full">
                {saving ? "Adding…" : "Onboard Facility"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="elevated-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{facilities.length}</p>
          <p className="text-xs text-muted-foreground">Total Facilities</p>
        </div>
        <div className="elevated-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{onlineCount}</p>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
        <div className="elevated-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalRecords.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Records</p>
        </div>
      </div>

      {/* Facility cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="elevated-card rounded-xl p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {facilities.map((f) => (
            <div key={f.id} className="elevated-card rounded-xl p-5 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    f.status === "online" ? "bg-success/10 text-success" : f.status === "degraded" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                  }`}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> {f.location}</p>
                    {f.facility_code && <p className="text-[10px] font-mono text-muted-foreground">ID: {f.facility_code}</p>}
                  </div>
                </div>
                <StatusBadge status={f.status} />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-mono font-semibold text-foreground">{f.uptime}%</span>
                </div>
                <Progress value={f.uptime} className="h-1.5" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Records</span>
                    <p className="font-semibold text-foreground">{f.records_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">EHR System</span>
                    <p className="font-semibold text-foreground">{f.ehr_system}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {f.last_sync ? `Last sync: ${new Date(f.last_sync).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Never synced"}
                  </span>
                  <SyncButton facilityId={f.id} onSynced={fetchFacilities} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
