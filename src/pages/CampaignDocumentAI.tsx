
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { FileText, Check } from "lucide-react";

const CampaignDocumentAI = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-slate-100 py-12 px-4 flex flex-col items-center">
    {/* Placeholder image for Document AI */}
    <img
      src="https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=800&h=600&fit=crop"
      alt="AI Document Automation"
      className="w-full max-w-xs md:max-w-md rounded-xl shadow-xl mb-8 object-cover aspect-video border-4 border-slate-200"
    />
    <div className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-block bg-gradient-to-r from-gray-800 to-blue-700 text-white rounded-full px-6 py-2 text-lg font-bold font-nunito mb-4 shadow-lg">
        <FileText className="inline mr-2 align-middle" /> AI Document Processing
      </span>
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 font-nunito mb-6">No More Document Chaos</h1>
      <p className="text-lg text-gray-900 font-semibold mb-3">Extract, classify, and automate documents with advanced AI.</p>
      <ul className="text-left text-base text-gray-800 mx-auto w-fit list-disc mb-6 space-y-1">
        <li>Powerful OCR & Data Extraction</li>
        <li>Custom Document Workflows</li>
        <li>Real-time Analytics <Check className="inline h-4 w-4 text-green-600 ml-1" /></li>
        <li>Seamless API Integration</li>
      </ul>
    </div>
    <LeadCaptureForm 
      service="AI Document Processing"
      description="Fill out your details and discover how Document AI can cut your workload dramatically."
    />
  </div>
)
export default CampaignDocumentAI;
