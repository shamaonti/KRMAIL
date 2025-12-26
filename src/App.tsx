import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* ✅ Dashboard handles ALL /dashboard/* routes internally */}
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/campaign/mailskrap" element={<CampaignMailSkrap />} />
          <Route path="/campaign/telephony" element={<CampaignTelephony />} />
          <Route path="/campaign/whatsapp" element={<CampaignWhatsApp />} />
          <Route path="/campaign/concierge" element={<CampaignConcierge />} />
          <Route path="/campaign/recruitment" element={<CampaignRecruitment />} />
          <Route path="/campaign/document-ai" element={<CampaignDocumentAI />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;