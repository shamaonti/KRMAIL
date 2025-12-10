
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
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

      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-[#012970] mb-6 font-['Nunito']">
            About MarketSkrap
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Empowering businesses with cutting-edge marketing and AI solutions to drive growth and success
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#012970] mb-4 font-['Nunito']">Our Mission</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              To democratize advanced marketing technologies and make AI-powered solutions accessible to businesses of all sizes, helping them scale efficiently and reach their full potential.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-[#012970] mb-4 font-['Nunito']">Innovation</h3>
                <p className="text-gray-600">
                  We continuously innovate to bring you the latest in marketing technology and AI solutions.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-[#012970] mb-4 font-['Nunito']">Simplicity</h3>
                <p className="text-gray-600">
                  Complex technologies made simple and accessible for businesses of all technical levels.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-[#012970] mb-4 font-['Nunito']">Results</h3>
                <p className="text-gray-600">
                  Our focus is on delivering measurable results that drive real business growth.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#012970] mb-4 font-['Nunito']">Our Leadership Team</h2>
            <p className="text-xl text-gray-600">
              Meet the visionaries behind MarketSkrap's success
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <Card className="text-center overflow-hidden">
              <div className="aspect-square bg-gray-100">
                <img 
                  src="/lovable-uploads/baedec5b-232f-4256-b649-26c1bcc5376d.png" 
                  alt="Rajesh P Nair"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-[#012970] mb-2 font-['Nunito']">Rajesh P Nair</h3>
                <p className="text-[#012970] font-semibold mb-4">Founder & CEO</p>
                <p className="text-gray-600 leading-relaxed">
                  With over 15 years of experience in marketing technology and AI, Rajesh leads MarketSkrap's vision to revolutionize how businesses approach digital marketing and automation.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center overflow-hidden">
              <div className="aspect-square bg-gray-100">
                <img 
                  src="/lovable-uploads/cd735888-c629-44e5-a868-9ff55d1753d3.png" 
                  alt="Muhammad Anas"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-[#012970] mb-2 font-['Nunito']">Muhammad Anas</h3>
                <p className="text-[#012970] font-semibold mb-4">VP Marketing</p>
                <p className="text-gray-600 leading-relaxed">
                  Muhammad brings deep expertise in growth marketing and customer acquisition, driving MarketSkrap's strategic marketing initiatives and partnerships across global markets.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-[#012970] mb-8 text-center font-['Nunito']">Our Story</h2>
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              MarketSkrap was born from a simple observation: while marketing technology was becoming increasingly sophisticated, it was also becoming increasingly complex and expensive for small to medium-sized businesses.
            </p>
            <p>
              Founded in 2024, we set out to bridge this gap by creating a comprehensive marketplace of marketing and AI tools that are both powerful and accessible. Our platform brings together email marketing, AI-powered automation, and advanced analytics in one seamless experience.
            </p>
            <p>
              Today, MarketSkrap serves thousands of businesses worldwide, from startups to enterprises, helping them leverage the power of AI and automation to grow faster and more efficiently than ever before.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-[#012970]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6 font-['Nunito']">
            Ready to Join Our Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Discover how MarketSkrap can transform your marketing efforts
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-lg px-8 py-4">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
