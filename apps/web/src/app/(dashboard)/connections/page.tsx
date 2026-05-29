"use client";

import { useState } from "react";
import { Plug, Loader2, Plus, Trash2, TestTube, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import {
  useFacilityConnections,
  useCreateFacilityConnection,
  useDeleteFacilityConnection,
  useTestFacilityConnection,
  useTriggerSync,
} from "@/api/facility-connections";
import { useFacilities } from "@/api/facilities";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";

export default function FacilityConnectionsPage() {
  const confirm = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    facilityId: "", ehrType: "", baseUrl: "", authType: "basic" as "basic" | "oauth2" | "api_key",
    username: "", password: "", apiKey: "", syncIntervalMinutes: 60,
  });

  const connectionsQuery = useFacilityConnections();
  const facilitiesQuery = useFacilities();
  const createMutation = useCreateFacilityConnection();
  const deleteMutation = useDeleteFacilityConnection();
  const testMutation = useTestFacilityConnection();
  const syncMutation = useTriggerSync();

  const connections = connectionsQuery.data ?? [];
  const facilities = facilitiesQuery.data ?? [];
  const loading = connectionsQuery.isPending || facilitiesQuery.isPending;
  const testing = testMutation.isPending ? testMutation.variables : null;
  const syncing = syncMutation.isPending ? syncMutation.variables : null;

  const handleCreate = () => {
    const authCredentials =
      form.authType === "basic" ? { username: form.username, password: form.password }
      : form.authType === "api_key" ? { apiKey: form.apiKey }
      : { clientId: form.username, clientSecret: form.password };

    createMutation.mutate(
      {
        facilityId: form.facilityId,
        ehrType: form.ehrType,
        baseUrl: form.baseUrl,
        authType: form.authType,
        authCredentials,
        syncIntervalMinutes: form.syncIntervalMinutes,
      },
      {
        onSuccess: () => {
          toast.success("Connection created");
          setAddOpen(false);
        },
        onError: (err) => toast.error(err.message || "Failed to create connection"),
      }
    );
  };

  const handleTest = (id: string) =>
    testMutation.mutate(id, {
      onSuccess: () => toast.success("Connection test successful"),
      onError: () => toast.error("Connection test failed"),
    });

  const handleSync = (id: string) =>
    syncMutation.mutate(id, {
      onSuccess: () => toast.success("Sync triggered"),
      onError: () => toast.error("Sync failed"),
    });

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete this connection?",
      description: "The EHR sync for this facility will stop immediately.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Connection deleted"),
      onError: () => toast.error("Failed to delete connection"),
    });
  };

  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EHR Connections</h1>
          <p className="text-sm text-muted-foreground">Manage FHIR R4 connections to hospital EHR systems</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} /> Add Connection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add EHR Connection</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Facility</Label>
                <Select value={form.facilityId} onValueChange={(v) => setForm((f) => ({ ...f, facilityId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                  <SelectContent>{facilities.map((fac) => <SelectItem key={fac.id} value={fac.id}>{fac.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>EHR System</Label><Input value={form.ehrType} onChange={(e) => setForm((f) => ({ ...f, ehrType: e.target.value }))} placeholder="OpenMRS" /></div>
                <div className="space-y-2"><Label>Sync Interval (min)</Label><Input type="number" value={form.syncIntervalMinutes} onChange={(e) => setForm((f) => ({ ...f, syncIntervalMinutes: +e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Base URL</Label><Input value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://ehr.hospital.ng/fhir" /></div>
              <div className="space-y-2">
                <Label>Auth Type</Label>
                <Select value={form.authType} onValueChange={(v) => setForm((f) => ({ ...f, authType: v as typeof form.authType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0 (client_credentials)</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.authType === "api_key" ? (
                <div className="space-y-2"><Label>API Key</Label><Input type="password" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} /></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{form.authType === "oauth2" ? "Client ID" : "Username"}</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>{form.authType === "oauth2" ? "Client Secret" : "Password"}</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
                </div>
              )}
              <Button onClick={handleCreate} className="w-full" disabled={!form.facilityId || !form.ehrType || !form.baseUrl}>
                Create Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Plug size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No EHR connections configured</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {connections.map((c) => (
            <div key={c.id} className="elevated-card rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.ehrType}</p>
                  <p className="text-xs text-muted-foreground">{facilityName(c.facilityId)}</p>
                </div>
                <StatusBadge status={c.isActive ? "online" : "offline"} />
              </div>
              <p className="text-xs font-mono text-muted-foreground break-all">{c.baseUrl}</p>
              <p className="text-xs text-muted-foreground">Auth: {c.authType} · Sync every {c.syncIntervalMinutes ?? 60}m</p>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleTest(c.id)} disabled={testing === c.id}>
                  {testing === c.id ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />} Test
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleSync(c.id)} disabled={syncing === c.id}>
                  {syncing === c.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync
                </Button>
                <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 ml-auto gap-1" onClick={() => handleDelete(c.id)}>
                  <Trash2 size={12} /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
