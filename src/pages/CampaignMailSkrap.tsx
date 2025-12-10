
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { Mail, Check } from "lucide-react";

const CampaignMailSkrap = () => (
  <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 py-12 px-4 flex flex-col items-center">
    {/* Placeholder image for Email Campaigns */}
    <img
      src="https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=800&h=600&fit=crop"
      alt="AI-powered Email Campaigns"
      className="w-full max-w-xs md:max-w-md rounded-xl shadow-xl mb-8 object-cover aspect-video border-4 border-blue-200"
    />
    <div className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-block bg-gradient-to-r from-blue-700 to-cyan-600 text-white rounded-full px-5 py-2 text-lg font-nunito font-bold mb-4 shadow-lg">
        <Mail className="mr-2 inline align-middle" /> MailSkrap: Boost Your Outreach!
      </span>
      <h1 className="text-4xl md:text-5xl font-bold text-blue-900 font-nunito mb-6">Unlock Advanced Email Campaigns</h1>
      <p className="text-lg text-blue-700 mb-3 font-semibold">Automate, Analyze, and Succeed with AI-Powered Email Marketing.</p>
      <ul className="text-left text-base text-blue-800 mx-auto w-fit list-disc mb-6 space-y-1">
        <li>Automated Sequences <Check className="inline h-4 w-4 text-green-600 ml-1" /></li>
        <li>In-depth Analytics</li>
        <li>High Open Rates</li>
        <li>Personalized Outreach</li>
      </ul>
    </div>
    <LeadCaptureForm 
      service="MailSkrap"
      description="Get started with the most intelligent email platform. Fill out your details to receive a free consultation."
    />
  </div>
)
export default CampaignMailSkrap;
