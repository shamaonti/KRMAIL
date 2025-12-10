
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { Phone, Check } from "lucide-react";

const CampaignTelephony = () => (
  <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-200 py-12 px-4 flex flex-col items-center">
    {/* Placeholder image for Telephony */}
    <img
      src="https://images.unsplash.com/photo-1520923642038-b4259ace2c59?w=800&h=600&fit=crop"
      alt="AI Telephony/Voice Agent"
      className="w-full max-w-xs md:max-w-md rounded-xl shadow-xl mb-8 object-cover aspect-video border-4 border-amber-200"
    />
    <div className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-block bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-full px-6 py-2 text-lg font-bold font-nunito mb-4 shadow-lg">
        <Phone className="inline mr-2 align-middle" /> RAIYA Telephony
      </span>
      <h1 className="text-4xl md:text-5xl font-bold text-amber-900 font-nunito mb-6">Transform TeleCalling with AI Agents</h1>
      <p className="text-lg text-amber-800 font-medium mb-3">AI-powered telephony for faster, smarter customer connections.</p>
      <ul className="text-left text-base text-amber-900 mx-auto w-fit list-disc mb-6 space-y-1">
        <li>Real Human-Like Voice Agents</li>
        <li>CRM Integration <Check className="inline h-4 w-4 text-green-600 ml-1" /></li>
        <li>Actionable Call Analytics</li>
        <li>Effortless Lead Qualification</li>
      </ul>
    </div>
    <LeadCaptureForm 
      service="RAIYA Telephony"
      description="Connect now and automate your telecalling campaigns with ease. Book your AI demo today!"
    />
  </div>
)
export default CampaignTelephony;
