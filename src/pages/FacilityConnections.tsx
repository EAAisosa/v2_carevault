import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, RefreshCw, Plug, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface FacilityConnection {
  id: string;
  facility_id: string;
  ehr_type: string;
  base_url: string;
  auth_type: string;
  fhir_version: string;
  sync_direction: string;
  sync_interval_minutes: number;
  is_active: boolean;
  last_successful_sync: string | null;
  created_at: string;
  facilities?: { name: string; location: string };
}

interface SyncLog {
  id: string;
  facility_id: string;
  direction: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  started_at: string;
  completed_at: string | null;
  facilities?: { name: string };
}

export default function FacilityConnections() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [ehrType, setEhrType] = useState("OpenMRS");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState("basic");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncDirection, setSyncDirection] = useState("pull");
  const [syncInterval, setSyncInterval] = useState("60");

  const { data: connections, isLoading: loadingConns } = useQuery({
    queryKey: ["facility-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_connections")
        .select("*, facilities(name, location)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FacilityConnection[];
    },
  });

  const { data: syncLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*, facilities(name)")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SyncLog[];
    },
  });

  const { data: facilities } = useQuery({
    queryKey: ["facilities-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("facilities").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createConnection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("facility_connections").insert({
        facility_id: selectedFacility,
        ehr_type: ehrType,
        base_url: baseUrl,
        auth_type: authType,
        auth_credentials: authType === "basic" ? { username, password } : {},
        sync_direction: syncDirection,
        sync_interval_minutes: parseInt(syncInterval),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connection created successfully");
      queryClient.invalidateQueries({ queryKey: ["facility-connections"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleConnection = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("facility_connections")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-connections"] });
      toast.success("Connection updated");
    },
  });

  const triggerSync = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("ehr-connector", {
        body: { action: "pull", connection_id: connectionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.records_synced} records`);
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["facility-connections"] });
    },
    onError: (err: any) => toast.error(`Sync failed: ${err.message}`),
  });

  const retryFailed = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ehr-connector", {
        body: { action: "retry" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Retried ${data.retried} sync(s)`);
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  function resetForm() {
    setSelectedFacility("");
    setEhrType("OpenMRS");
    setBaseUrl("");
    setAuthType("basic");
    setUsername("");
    setPassword("");
    setSyncDirection("pull");
    setSyncInterval("60");
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} className="text-success" />;
      case "failed": return <XCircle size={14} className="text-destructive" />;
      case "in_progress":
      case "retrying": return <Loader2 size={14} className="animate-spin text-warning" />;
      default: return <Clock size={14} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EHR Connections</h1>
          <p className="text-sm text-muted-foreground">Manage connections to hospital EMR/EHR systems</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Connection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New EHR Connection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Facility</Label>
                <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                  <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                  <SelectContent>
                    {facilities?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>EHR Type</Label>
                  <Select value={ehrType} onValueChange={setEhrType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["OpenMRS", "Bahmni", "DHIS2", "CommCare", "Custom FHIR"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Auth Type</Label>
                  <Select value={authType} onValueChange={setAuthType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>FHIR Endpoint URL</Label>
                <Input placeholder="https://ehr.hospital.ng/openmrs/ws/fhir2/R4" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              </div>
              {authType === "basic" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sync Direction</Label>
                  <Select value={syncDirection} onValueChange={setSyncDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pull">Pull (Inbound)</SelectItem>
                      <SelectItem value="push">Push (Outbound)</SelectItem>
                      <SelectItem value="bidirectional">Bidirectional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sync Interval (min)</Label>
                  <Input type="number" value={syncInterval} onChange={(e) => setSyncInterval(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={() => createConnection.mutate()} disabled={!selectedFacility || !baseUrl || createConnection.isPending}>
                {createConnection.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections ({connections?.length || 0})</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs ({syncLogs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {loadingConns ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : connections?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No EHR connections configured yet. Add one to get started.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {connections?.map((conn) => (
                <Card key={conn.id} className="transition-all hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${conn.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          <Plug size={18} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{conn.facilities?.name || "Unknown"}</CardTitle>
                          <p className="text-xs text-muted-foreground">{conn.facilities?.location}</p>
                        </div>
                      </div>
                      <Switch checked={conn.is_active} onCheckedChange={(checked) => toggleConnection.mutate({ id: conn.id, is_active: checked })} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{conn.ehr_type}</Badge>
                      <Badge variant="outline">FHIR {conn.fhir_version}</Badge>
                      <Badge variant="secondary">{conn.sync_direction}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="truncate font-mono">{conn.base_url}</p>
                      <p>Auth: {conn.auth_type} · Every {conn.sync_interval_minutes}min</p>
                      {conn.last_successful_sync && (
                        <p>Last sync: {new Date(conn.last_successful_sync).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      disabled={!conn.is_active || triggerSync.isPending}
                      onClick={() => triggerSync.mutate(conn.id)}
                    >
                      {triggerSync.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Sync Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => retryFailed.mutate()} disabled={retryFailed.isPending}>
              {retryFailed.isPending ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              Retry Failed
            </Button>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : syncLogs?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No sync logs yet.</CardContent></Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Facility</th>
                    <th className="px-4 py-2 text-left font-medium">Direction</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Records</th>
                    <th className="px-4 py-2 text-left font-medium">Retries</th>
                    <th className="px-4 py-2 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs?.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{log.facilities?.name || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">{log.direction}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(log.status)}
                          <span className="capitalize">{log.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-success">{log.records_processed}</span>
                        {log.records_failed > 0 && <span className="text-destructive ml-1">/ {log.records_failed} failed</span>}
                      </td>
                      <td className="px-4 py-2">{log.retry_count}/{log.max_retries}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(log.started_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
