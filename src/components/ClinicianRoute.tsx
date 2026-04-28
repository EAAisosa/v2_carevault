import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

/** Blocks researchers from accessing clinician/PHI views. Clinicians + admins allowed. */
export default function ClinicianRoute({ children }: { children: ReactNode }) {
  const { isResearcher } = useAuth();
  if (isResearcher) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert size={28} className="text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Researchers cannot access identifiable patient records. Use the Research Portal for de-identified data.
        </p>
        <Link to="/research" className="text-sm font-medium text-primary hover:underline">
          ← Back to Research Portal
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
