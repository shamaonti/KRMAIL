
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-[#012970] font-['Nunito']">
                MarketSkrap
              </h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button variant="outline" className="border-[#012970] text-[#012970] hover:bg-blue-50">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-[#1e3a8a] hover:bg-[#1e40af]">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-[#012970] mb-8 font-['Nunito']">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: June 14, 2024</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">1. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect information you provide directly to us, such as when you create an account, use our services, or contact us. This may include:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Name and contact information</li>
                <li>Account credentials</li>
                <li>Email content and metadata</li>
                <li>Usage data and analytics</li>
                <li>Payment information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">2. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends and usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">3. Information Sharing</h2>
              <p className="text-gray-700 leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-4">
                <li>With your consent</li>
                <li>To comply with laws or legal process</li>
                <li>To protect our rights and property</li>
                <li>With service providers who assist us in operating our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">4. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">5. Email Marketing Compliance</h2>
              <p className="text-gray-700 leading-relaxed">
                Our MailSkrap service is designed to help you comply with email marketing laws. We provide tools for managing opt-outs, maintaining consent records, and following best practices for email marketing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">6. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of certain communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">7. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">8. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at privacy@marketskrap.com or through our contact form.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
