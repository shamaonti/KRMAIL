
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { User, Check } from "lucide-react";

const CampaignConcierge = () => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-violet-100 py-12 px-4 flex flex-col items-center">
    {/* Placeholder image for Concierge ChatBot */}
    <img
      src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop"
      alt="AI Concierge Chatbot"
      className="w-full max-w-xs md:max-w-md rounded-xl shadow-xl mb-8 object-cover aspect-video border-4 border-violet-200"
    />
    <div className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-block bg-gradient-to-r from-indigo-700 to-violet-500 text-white rounded-full px-6 py-2 text-lg font-bold font-nunito mb-4 shadow-lg">
        <User className="inline mr-2 align-middle" /> RAIYA Concierge
      </span>
      <h1 className="text-4xl md:text-5xl font-bold text-indigo-900 font-nunito mb-6">Meet Your New AI ChatBot</h1>
      <p className="text-lg text-violet-800 font-semibold mb-3">24/7 AI assistant: generate leads, answer queries, and drive conversions.</p>
      <ul className="text-left text-base text-indigo-900 mx-auto w-fit list-disc mb-6 space-y-1">
        <li>Smart Conversations</li>
        <li>Omni-channel Presence</li>
        <li>Customizable AI Flow <Check className="inline h-4 w-4 text-green-600 ml-1" /></li>
        <li>Integrates with CRM</li>
      </ul>
    </div>
    <LeadCaptureForm 
      service="RAIYA Concierge"
      description="Claim your free AI Concierge chatbot setup. Fill details & get expert guidance."
    />
  </div>
)
export default CampaignConcierge;
