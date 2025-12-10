
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => {
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
          <h1 className="text-4xl font-bold text-[#012970] mb-8 font-['Nunito']">Terms & Conditions</h1>
          <p className="text-gray-600 mb-8">Last updated: June 14, 2024</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using MarketSkrap's services, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">2. Use License</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Permission is granted to temporarily use MarketSkrap's services for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained on the website</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">3. Email Marketing Services</h2>
              <p className="text-gray-700 leading-relaxed">
                Our MailSkrap service must be used in compliance with all applicable laws and regulations, including but not limited to anti-spam legislation. Users are responsible for obtaining proper consent before sending marketing emails.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">4. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">5. Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not use our services:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">6. Disclaimer</h2>
              <p className="text-gray-700 leading-relaxed">
                The materials on MarketSkrap's website are provided on an 'as is' basis. MarketSkrap makes no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#012970] mb-4 font-['Nunito']">7. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms & Conditions, please contact us at legal@marketskrap.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
