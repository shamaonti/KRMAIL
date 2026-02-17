
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Mail, Phone, MessageCircle, Bot, Users, FileText, CheckCircle, Star, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const services = [
    {
      id: "mailskrap",
      title: "MailSkrap",
      subtitle: "Email Marketing",
      description: "Advanced email marketing platform with automation, analytics, and lead management",
      icon: Mail,
      status: "active",
      action: "Get Started",
      link: "/auth",
      features: ["Campaign Automation", "Lead Scoring", "Analytics Dashboard", "A/B Testing"]
    },
    {
      id: "telephony",
      title: "RAIYA Telephony",
      subtitle: "TeleCalling Marketing",
      description: "AI-powered telephony solutions for efficient telecalling campaigns",
      icon: Phone,
      status: "active",
      action: "Learn More",
      link: "https://speedtech.ai/telephony?utm_source=marketskrap&utm_medium=marketskrap&utm_campaign=marketskrap_raiya",
      external: true,
      features: ["AI Voice Agents", "Call Analytics", "Lead Qualification", "CRM Integration"]
    },
    {
      id: "whatsapp",
      title: "WhatsApp Marketing",
      subtitle: "Coming Soon",
      description: "Powerful WhatsApp marketing automation for customer engagement",
      icon: MessageCircle,
      status: "coming-soon",
      action: "Notify Me",
      features: ["Bulk Messaging", "Chat Automation", "Customer Support", "Analytics"]
    },
    {
      id: "concierge",
      title: "RAIYA Concierge",
      subtitle: "AI ChatBot",
      description: "Intelligent AI chatbot for customer service and lead generation",
      icon: Bot,
      status: "active",
      action: "Contact Us",
      link: "https://speedtech.ai/contact?utm_source=marketskrap&utm_medium=marketskrap&utm_campaign=marketskrap_concierge",
      external: true,
      features: ["24/7 Support", "Natural Language Processing", "Multi-channel", "Custom Training"]
    },
    {
      id: "recruitment",
      title: "AI Recruitment",
      subtitle: "Smart Hiring",
      description: "AI-driven recruitment solutions for efficient talent acquisition",
      icon: Users,
      status: "active",
      action: "Contact Us",
      link: "https://speedtech.ai/contact?utm_source=marketskrap&utm_medium=marketskrap&utm_campaign=marketskrap_resume",
      external: true,
      features: ["Resume Screening", "Candidate Matching", "Interview Scheduling", "Skills Assessment"]
    },
    {
      id: "document",
      title: "AI Document Processing",
      subtitle: "Intelligent Processing",
      description: "Advanced AI solutions for automated document processing and analysis",
      icon: FileText,
      status: "active",
      action: "Contact Us",
      link: "https://speedtech.ai/contact?utm_source=marketskrap&utm_medium=marketskrap&utm_campaign=marketskrap_idp",
      external: true,
      features: ["OCR Technology", "Data Extraction", "Document Classification", "Workflow Automation"]
    }
  ];

  const handleServiceClick = (service: any) => {
    if (service.external) {
      window.open(service.link, '_blank');
    } else if (service.status === 'coming-soon') {
      alert('We\'ll notify you when WhatsApp Marketing is available!');
    }
  };

  const statistics = [
    { number: "10,000+", label: "Active Users", icon: Users },
    { number: "500K+", label: "Emails Sent Monthly", icon: Mail },
    { number: "98%", label: "Delivery Rate", icon: TrendingUp },
    { number: "24/7", label: "Customer Support", icon: Zap }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
      rating: 5,
      text: "MarketSkrap transformed our email marketing. The automation features saved us hours while improving our open rates by 40%."
    },
    {
      name: "Michael Chen",
      company: "Digital Solutions Ltd.",
      rating: 5,
      text: "The AI-powered features are incredible. Lead scoring and automated sequences have doubled our conversion rates."
    },
    {
      name: "Emily Rodriguez",
      company: "Growth Marketing Co.",
      rating: 5,
      text: "Best marketing platform we've used. The integration capabilities and user-friendly interface make it perfect for our team."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* SEO-optimized meta content would be handled by helmet or similar */}
      
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-[#012970] font-nunito">
                MailSkrap
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="#services" className="text-gray-700 hover:text-[#012970] transition-colors">
                Services
              </Link>
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

      {/* Hero Section with AI-generated image */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 font-nunito">
                Transform Your
                <span className="text-[#012970]"> Marketing </span>
                with AI-Powered Solutions
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                MarketSkrap is the ultimate marketing and AI marketplace designed to accelerate business growth. 
                From intelligent email marketing automation to AI-driven customer engagement, we provide 
                cutting-edge tools that deliver measurable results for modern businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-lg px-8 py-4">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
                {statistics.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex justify-center mb-2">
                      <stat.icon className="h-6 w-6 text-[#012970]" />
                    </div>
                    <div className="text-2xl font-bold text-[#012970] font-nunito">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* AI-generated hero image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                  alt="AI-powered marketing analytics dashboard showing growth metrics and automation workflows"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#012970]/20 to-transparent"></div>
              </div>
              
              {/* Floating elements for visual appeal */}
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live Analytics</span>
                </div>
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#012970] font-nunito">+250%</div>
                  <div className="text-sm text-gray-600">ROI Increase</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-nunito">
              Why Choose <span className="text-[#012970]">MarketSkrap?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Leverage the power of artificial intelligence to automate your marketing processes, 
              increase customer engagement, and drive unprecedented business growth.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-[#012970]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 font-nunito">AI-Powered Automation</h3>
              <p className="text-gray-600">Automate repetitive tasks with intelligent workflows that learn and optimize over time.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-[#012970]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 font-nunito">Measurable Results</h3>
              <p className="text-gray-600">Track performance with detailed analytics and insights that drive data-driven decisions.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-[#012970]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 font-nunito">Expert Support</h3>
              <p className="text-gray-600">Get 24/7 support from our team of marketing and AI specialists.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-nunito">
              Our <span className="text-[#012970]">Services</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive marketing and AI solutions designed to transform your business operations and drive sustainable growth
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 hover:border-[#012970]/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <service.icon className="h-6 w-6 text-[#012970]" />
                    </div>
                    {service.status === 'coming-soon' && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 font-nunito">
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-[#012970] font-medium">
                    {service.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {service.status === 'active' && service.link ? (
                    service.external ? (
                      <Button 
                        className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]"
                        onClick={() => handleServiceClick(service)}
                      >
                        {service.action}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Link to={service.link} className="block">
                        <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]">
                          {service.action}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-[#012970] text-[#012970] hover:bg-blue-50"
                      onClick={() => handleServiceClick(service)}
                      disabled={service.status === 'coming-soon'}
                    >
                      {service.action}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-nunito">
              What Our <span className="text-[#012970]">Customers Say</span>
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied customers who have transformed their marketing with MarketSkrap
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-[#012970]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6 font-nunito">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses already using MarketSkrap's powerful AI-driven marketing tools to accelerate growth and increase ROI
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-lg px-8 py-4">
              Start Your Free Trial Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4 text-[#012970] font-nunito">MarketSkrap</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your complete marketing & AI marketplace. Empowering businesses with cutting-edge tools for email marketing, automation, and intelligent customer engagement.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-800">
                  LinkedIn
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-800">
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-800">
                  Facebook
                </Button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white font-nunito">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/auth" className="text-gray-400 hover:text-white transition-colors">Get Started</Link></li>
                <li><a href="mailto:contact@marketskrap.com" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white font-nunito">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><a href="mailto:legal@marketskrap.com" className="text-gray-400 hover:text-white transition-colors">Legal Inquiries</a></li>
                <li><a href="mailto:support@marketskrap.com" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">© 2025 MarketSkrap, a Marketing Wing of EarnWealth Group. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
