import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import PatientSearch from "@/pages/PatientSearch";
import PatientSummary from "@/pages/PatientSummary";
import StagingQueue from "@/pages/StagingQueue";
import AuditLogs from "@/pages/AuditLogs";
import IntegratedRecords from "@/pages/IntegratedRecords";
import Facilities from "@/pages/Facilities";
import UserManagement from "@/pages/UserManagement";
import NotFound from "./pages/NotFound";
import AdminRoute from "@/components/AdminRoute";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import FacilityConnections from "@/pages/FacilityConnections";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<PatientSearch />} />
              <Route path="/patient/:id" element={<PatientSummary />} />
              <Route path="/staging" element={<AdminRoute superOnly><StagingQueue /></AdminRoute>} />
              <Route path="/integrated" element={<AdminRoute superOnly><IntegratedRecords /></AdminRoute>} />
              <Route path="/facilities" element={<AdminRoute superOnly><Facilities /></AdminRoute>} />
              <Route path="/audit" element={<AdminRoute superOnly><AuditLogs /></AdminRoute>} />
              <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="/connections" element={<AdminRoute><FacilityConnections /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      }
    />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
