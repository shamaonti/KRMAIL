
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Star, 
  Tag,
  MoreHorizontal,
  TrendingUp,
  Eye
} from "lucide-react";

const LeadsPage = () => {
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const mockLeads = [
    {
      id: 1,
      email: 'john.doe@prospect.com',
      name: 'John Doe',
      company: 'Prospect Inc.',
      addedDate: '2024-01-15',
      campaigns: 3,
      lastCampaign: '2024-01-20',
      status: 'Hot Lead',
      score: 85,
      engagement: 'High',
      tags: ['Enterprise', 'SaaS']
    },
    {
      id: 2,
      email: 'sarah.wilson@company.com',
      name: 'Sarah Wilson',
      company: 'Wilson Corp',
      addedDate: '2024-01-14',
      campaigns: 2,
      lastCampaign: '2024-01-19',
      status: 'Replied',
      score: 70,
      engagement: 'Medium',
      tags: ['SMB']
    },
    {
      id: 3,
      email: 'mike.brown@startup.io',
      name: 'Mike Brown',
      company: 'Startup.io',
      addedDate: '2024-01-13',
      campaigns: 1,
      lastCampaign: '2024-01-18',
      status: 'Cold Lead',
      score: 45,
      engagement: 'Low',
      tags: ['Tech', 'Startup']
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Hot Lead':
        return 'bg-red-100 text-red-800';
      case 'Replied':
        return 'bg-green-100 text-green-800';
      case 'Cold Lead':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementColor = (engagement) => {
    switch (engagement) {
      case 'High':
        return 'text-green-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Leads Management</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
                <Upload className="mr-2 h-4 w-4" />
                Import Leads
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold" style={{ color: '#012970' }}>2,847</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hot Leads</p>
                  <p className="text-2xl font-bold text-red-600">348</p>
                </div>
                <div className="bg-red-100 p-2 rounded-lg">
                  <Star className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Replied</p>
                  <p className="text-2xl font-bold text-green-600">156</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg">
                  <Eye className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Score</p>
                  <p className="text-2xl font-bold" style={{ color: '#012970' }}>67</p>
                </div>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border border-gray-200 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search leads by email, name, or company..." 
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="hot">Hot Leads</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="cold">Cold Leads</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by engagement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Engagement</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="border-gray-300">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>

            {selectedLeads.length > 0 && (
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedLeads.length} leads selected
                </span>
                <Button size="sm" variant="outline" className="border-gray-300">
                  <Tag className="mr-2 h-4 w-4" />
                  Add Tag
                </Button>
                <Button size="sm" variant="outline" className="border-gray-300">
                  Export Selected
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedLeads.length === mockLeads.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeads(mockLeads.map(lead => lead.id));
                        } else {
                          setSelectedLeads([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Lead Information</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Added Date</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Last Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLeads.map((lead) => (
                  <TableRow key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLeads([...selectedLeads, lead.id]);
                          } else {
                            setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-gray-500">{lead.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-900">{lead.company}</TableCell>
                    <TableCell className="text-gray-600">{lead.addedDate}</TableCell>
                    <TableCell className="text-center">{lead.campaigns}</TableCell>
                    <TableCell className="text-gray-600">{lead.lastCampaign}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${lead.score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{lead.score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getEngagementColor(lead.engagement)}`}>
                        {lead.engagement}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lead Funnel Visualization */}
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="font-nunito" style={{ color: '#012970' }}>Lead Progression Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '100%' }}>
                    Total Leads: 2,847
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-yellow-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '60%' }}>
                    Engaged: 1,708
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-green-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '30%' }}>
                    Qualified: 854
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-purple-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '15%' }}>
                    Converted: 427
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default LeadsPage;
