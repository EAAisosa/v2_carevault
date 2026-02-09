import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import PatientSearch from "@/pages/PatientSearch";
import PatientSummary from "@/pages/PatientSummary";
import StagingQueue from "@/pages/StagingQueue";
import AuditLogs from "@/pages/AuditLogs";
import ConnectorStatus from "@/pages/ConnectorStatus";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<PatientSearch />} />
            <Route path="/patient/:id" element={<PatientSummary />} />
            <Route path="/staging" element={<StagingQueue />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/connectors" element={<ConnectorStatus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
