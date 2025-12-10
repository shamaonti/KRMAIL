
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "10 Email Marketing Strategies That Actually Work in 2024",
      excerpt: "Discover the latest email marketing trends and strategies that are driving real results for businesses worldwide.",
      author: "Rajesh P Nair",
      date: "2024-06-10",
      category: "Email Marketing",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 2,
      title: "The Future of AI in Marketing: What You Need to Know",
      excerpt: "Explore how artificial intelligence is revolutionizing marketing automation and customer engagement.",
      author: "Muhammad Anas",
      date: "2024-06-08",
      category: "AI Marketing",
      readTime: "7 min read",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 3,
      title: "Building Effective Cold Email Campaigns",
      excerpt: "Learn the art of crafting cold emails that get opened, read, and generate responses.",
      author: "Rajesh P Nair",
      date: "2024-06-05",
      category: "Cold Outreach",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 4,
      title: "WhatsApp Business API: The Complete Guide",
      excerpt: "Everything you need to know about leveraging WhatsApp for business communication.",
      author: "Muhammad Anas",
      date: "2024-06-03",
      category: "WhatsApp Marketing",
      readTime: "8 min read",
      image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80"
    }
  ];

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
            MarketSkrap Blog
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Insights, strategies, and trends in marketing and AI to help grow your business
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {blogPosts.map((post) => (
              <Card key={post.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 hover:border-[#012970]/20">
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="bg-[#012970]/10 text-[#012970]">
                      {post.category}
                    </Badge>
                    <span className="text-sm text-gray-500">{post.readTime}</span>
                  </div>
                  <CardTitle className="text-xl font-bold text-[#012970] font-['Nunito'] group-hover:text-[#1e3a8a] transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {post.author}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(post.date).toLocaleDateString()}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[#012970] hover:text-[#1e3a8a] hover:bg-[#012970]/5">
                      Read More
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-[#012970]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6 font-['Nunito']">
            Stay Updated with MarketSkrap
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest marketing insights and AI trends delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-blue-300"
            />
            <Button className="bg-[#1e3a8a] hover:bg-[#1e40af] whitespace-nowrap">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog;
