import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function ResearcherRoute({ children }: { children: ReactNode }) {
  const { isResearcher } = useAuth();
  if (!isResearcher) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert size={28} className="text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Researcher Access Only</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This area is restricted to authorised researchers with approved access.
        </p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">← Back home</Link>
      </div>
    );
  }
  return <>{children}</>;
}
