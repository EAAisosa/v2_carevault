import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Facility = Tables<"facilities">;

export default function ConnectorStatus() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase.from("facilities").select("*").order("name");
      setFacilities(data || []);
      setLoading(false);
    };
    fetchFacilities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hospital Connectors</h1>
        <p className="text-sm text-muted-foreground">Monitor connected hospital EHR systems and sync status</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {facilities.length === 0 && (
          <div className="col-span-full elevated-card rounded-xl p-8 text-center text-muted-foreground text-sm">
            No connected facilities found.
          </div>
        )}
        {facilities.map((c) => (
          <div key={c.id} className="elevated-card rounded-xl p-5 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  c.status === "online" ? "bg-success/10 text-success" : c.status === "degraded" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                }`}>
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.location}</p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-mono font-semibold text-foreground">{c.uptime}%</span>
              </div>
              <Progress value={c.uptime} className="h-1.5" />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Records</span>
                  <p className="font-semibold text-foreground">{c.records_count.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">EHR System</span>
                  <p className="font-semibold text-foreground">{c.ehr_system}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Last sync: {c.last_sync
                    ? new Date(c.last_sync).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Never"}
                </span>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                  <RefreshCw size={10} /> Sync
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
