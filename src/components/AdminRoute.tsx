import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminRouteProps {
  children: ReactNode;
  /** If true, only CareVault admins can access. Otherwise any admin role can. */
  superOnly?: boolean;
}

export default function AdminRoute({ children, superOnly = false }: AdminRouteProps) {
  const { isCareVaultAdmin, isAnyAdmin } = useAuth();

  const hasAccess = superOnly ? isCareVaultAdmin : isAnyAdmin;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert size={28} className="text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {superOnly
            ? "This section is only available to CareVault System Administrators."
            : "This section is only available to Administrators."}
        </p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
