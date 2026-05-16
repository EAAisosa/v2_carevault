import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Facility {
  id: string; name: string; location: string; state: string;
  ehr_system: string; status: string; uptime: number;
  records_count: number; last_sync: string | null;
}

export default function ConnectorStatus() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFacilities = async () => {
    const { data } = await supabase
      .from("facilities")
      .select("id, name, location, state, ehr_system, status, uptime, records_count, last_sync")
      .order("name");
    if (data) setFacilities(data as Facility[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchFacilities(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchFacilities(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hospital Connectors</h1>
          <p className="text-sm text-muted-foreground">Monitor connected hospital EHR systems and sync status</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin mr-2" : "mr-2"} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : facilities.length === 0 ? (
        <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
          No facilities connected yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {facilities.map((f) => (
            <div key={f.id} className="elevated-card rounded-xl p-5 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    f.status === "online" ? "bg-success/10 text-success"
                    : f.status === "degraded" ? "bg-warning/10 text-warning"
                    : "bg-destructive/10 text-destructive"
                  }`}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{f.name}</h3>
                    <p className="text-xs text-muted-foreground">{f.location}, {f.state}</p>
                  </div>
                </div>
                <StatusBadge status={f.status} />
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="font-medium">{f.uptime}%</span>
                  </div>
                  <Progress value={f.uptime} className="h-1.5" />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">EHR System</span>
                  <span className="font-medium">{f.ehr_system}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Records</span>
                  <span className="font-medium">{f.records_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="font-mono text-muted-foreground">
                    {f.last_sync ? new Date(f.last_sync).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" }) : "Never"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
