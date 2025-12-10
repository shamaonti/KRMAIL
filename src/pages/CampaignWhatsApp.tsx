
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { MessageSquare, Check } from "lucide-react";

const CampaignWhatsApp = () => (
  <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-lime-50 py-12 px-4 flex flex-col items-center">
    {/* Placeholder image for WhatsApp Marketing */}
    <img
      src="https://images.unsplash.com/photo-1633356122544-f154448535ce?w=800&h=600&fit=crop"
      alt="WhatsApp Marketing"
      className="w-full max-w-xs md:max-w-md rounded-xl shadow-xl mb-8 object-cover aspect-video border-4 border-green-200"
    />
    <div className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-block bg-gradient-to-r from-green-600 to-lime-500 text-white rounded-full px-6 py-2 text-lg font-bold font-nunito mb-4 shadow-lg">
        <MessageSquare className="inline mr-2 align-middle" /> WhatsApp Marketing
      </span>
      <h1 className="text-4xl md:text-5xl font-bold text-green-900 font-nunito mb-6">
        Supercharge Engagement on WhatsApp
      </h1>
      <p className="text-lg text-green-800 font-semibold mb-3">
        Automated, bulk, and interactive WhatsApp campaigns for your brand.
      </p>
      <ul className="text-left text-base text-green-900 mx-auto w-fit list-disc mb-6 space-y-1">
        <li>Bulk Messaging at Scale</li>
        <li>
          Chatbot Automation
          <Check className="inline h-4 w-4 text-green-600 ml-1" />
        </li>
        <li>Live Analytics</li>
        <li>Personalized Customer Support</li>
      </ul>
    </div>
    <LeadCaptureForm
      service="WhatsApp Marketing"
      description="Enter your details and we'll set you up for priority access to the WhatsApp marketing suite."
    />
  </div>
);

export default CampaignWhatsApp;
