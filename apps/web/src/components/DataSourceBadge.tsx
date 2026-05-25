export default function DataSourceBadge({ hospital }: { hospital: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {hospital ?? "Unknown"}
    </span>
  );
}
