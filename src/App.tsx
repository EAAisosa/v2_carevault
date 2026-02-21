import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { RoleProvider } from "@/contexts/RoleContext";
import Dashboard from "@/pages/Dashboard";
import PatientSearch from "@/pages/PatientSearch";
import PatientSummary from "@/pages/PatientSummary";
import StagingQueue from "@/pages/StagingQueue";
import AuditLogs from "@/pages/AuditLogs";
import ConnectorStatus from "@/pages/ConnectorStatus";
import IntegratedRecords from "@/pages/IntegratedRecords";
import NotFound from "./pages/NotFound";
import AdminRoute from "@/components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<PatientSearch />} />
              <Route path="/patient/:id" element={<PatientSummary />} />
              <Route path="/staging" element={<AdminRoute><StagingQueue /></AdminRoute>} />
              <Route path="/integrated" element={<AdminRoute><IntegratedRecords /></AdminRoute>} />
              <Route path="/audit" element={<AdminRoute><AuditLogs /></AdminRoute>} />
              <Route path="/connectors" element={<AdminRoute><ConnectorStatus /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
