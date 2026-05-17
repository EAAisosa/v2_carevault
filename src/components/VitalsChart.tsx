import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type VitalRecord = Tables<"vital_records">;

interface VitalsChartProps {
  data: VitalRecord[];
}

export default function VitalsChart({ data }: VitalsChartProps) {
  const chartData = [...data].reverse().map((v) => ({
    date: new Date(v.recorded_date + "T00:00:00").toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    Systolic: v.systolic,
    Diastolic: v.diastolic,
    "Heart Rate": v.heart_rate,
    SpO2: v.spo2,
  }));

  return (
    <div className="elevated-card rounded-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Vitals Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Systolic" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Diastolic" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Heart Rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="SpO2" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
