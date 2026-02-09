import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-muted",
  discontinued: "bg-destructive/10 text-destructive border-destructive/20",
  "in-progress": "bg-info/10 text-info border-info/20",
  online: "bg-success/10 text-success border-success/20",
  offline: "bg-destructive/10 text-destructive border-destructive/20",
  degraded: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  "needs-review": "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  failure: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  normal: "bg-success/10 text-success border-success/20",
  abnormal: "bg-warning/10 text-warning border-warning/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  mild: "bg-muted text-muted-foreground border-muted",
  moderate: "bg-warning/10 text-warning border-warning/20",
  severe: "bg-destructive/10 text-destructive border-destructive/20",
  low: "bg-muted text-muted-foreground border-muted",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-muted text-muted-foreground border-muted";
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold ${style}`}>
      {status.replace("-", " ")}
    </Badge>
  );
}
