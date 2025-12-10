
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { Users, Check } from "lucide-react";

const CampaignRecruitment = () => (
  <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-fuchsia-50 py-12 px-4 flex flex-col items-center">
    {/* Placeholder image for AI Recruitment */}
    <img
      src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=600&fit=crop"
      alt="AI-driven Recruitment"
      className="w-full max-w-xs md:max-w-md rounded-xl shadow-xl mb-8 object-cover aspect-video border-4 border-pink-200"
    />
    <div className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-block bg-gradient-to-r from-fuchsia-700 to-pink-600 text-white rounded-full px-6 py-2 text-lg font-bold font-nunito mb-4 shadow-lg">
        <Users className="inline mr-2 align-middle" /> AI Recruitment
      </span>
      <h1 className="text-4xl md:text-5xl font-bold text-fuchsia-900 font-nunito mb-6">Find & Hire Top Talent with AI</h1>
      <p className="text-lg text-pink-800 font-semibold mb-3">Automate screening, match instantly, interview the best—no manual effort.</p>
      <ul className="text-left text-base text-fuchsia-900 mx-auto w-fit list-disc mb-6 space-y-1">
        <li>AI-driven Candidate Sorting</li>
        <li>Faster Shortlisting <Check className="inline h-4 w-4 text-green-600 ml-1" /></li>
        <li>Automated Scheduling</li>
        <li>Easy Skills Assessment</li>
      </ul>
    </div>
    <LeadCaptureForm 
      service="AI Recruitment"
      description="Transform your hiring process. Share your details & let AI do the rest!"
    />
  </div>
)
export default CampaignRecruitment;
