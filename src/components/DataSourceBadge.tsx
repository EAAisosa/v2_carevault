interface DataSourceBadgeProps {
  hospital: string;
}

const hospitalColors: Record<string, string> = {
  "Lagos University Teaching Hospital": "bg-primary/10 text-primary",
  "General Hospital Ikeja": "bg-info/10 text-info",
  "National Hospital Abuja": "bg-accent/10 text-accent",
  "Ahmadu Bello University Teaching Hospital": "bg-warning/10 text-warning",
  "University of Nigeria Teaching Hospital": "bg-success/10 text-success",
  "University College Hospital Ibadan": "bg-destructive/10 text-destructive",
  "Aminu Kano Teaching Hospital": "bg-primary/10 text-primary",
};

export default function DataSourceBadge({ hospital }: DataSourceBadgeProps) {
  const safe = hospital || "Unknown";
  const abbrev = safe
    .split(" ")
    .filter((w) => w.length > 2)
    .map((w) => w[0])
    .join("")
    .slice(0, 4);

  const colorClass = hospitalColors[safe] || "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
      {abbrev}
      <span className="hidden sm:inline font-normal normal-case tracking-normal text-[10px]">
        {safe.length > 25 ? safe.slice(0, 25) + "…" : safe}
      </span>
    </span>
  );
}
