import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Blog from "./pages/Blog";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";

import CampaignMailSkrap from "./pages/CampaignMailSkrap";
import CampaignTelephony from "./pages/CampaignTelephony";
import CampaignWhatsApp from "./pages/CampaignWhatsApp";
import CampaignConcierge from "./pages/CampaignConcierge";
import CampaignRecruitment from "./pages/CampaignRecruitment";
import CampaignDocumentAI from "./pages/CampaignDocumentAI";

const queryClient = new QueryClient();


// ✅ Protected Route Component (INLINE - no extra file needed)
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem("user");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Index />} />

          {/* Auth Routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />

          {/* Redirect old routes */}
          <Route path="/signin" element={<Navigate to="/login" replace />} />

          {/* ✅ PROTECTED DASHBOARD */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Other Pages */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />

          {/* Campaign Pages */}
          <Route path="/campaign/mailskrap" element={<CampaignMailSkrap />} />
          <Route path="/campaign/telephony" element={<CampaignTelephony />} />
          <Route path="/campaign/whatsapp" element={<CampaignWhatsApp />} />
          <Route path="/campaign/concierge" element={<CampaignConcierge />} />
          <Route path="/campaign/recruitment" element={<CampaignRecruitment />} />
          <Route path="/campaign/document-ai" element={<CampaignDocumentAI />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;