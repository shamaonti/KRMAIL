import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Eye,
  Plus,
  X
} from "lucide-react";

const LeadsPage = () => {
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    total_leads: 0,
    hot_leads: 0,
    replied: 0,
    avg_score: 0
  });
  const [funnelData, setFunnelData] = useState({
    total_leads: 0,
    engaged: 0,
    qualified: 0,
    converted: 0
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newLead, setNewLead] = useState({
    email: '',
    name: '',
    company: '',
    status: 'New',
    score: 0,
    engagement: 'None',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // ✅ DEBOUNCE SEARCH QUERY (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isAddModalOpen || isImportModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddModalOpen, isImportModalOpen]);

  // ✅ FETCH LEADS - Only triggered by debounced search and filters
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterEngagement !== 'all') params.append('engagement', filterEngagement);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);

      const response = await fetch(`http://localhost:3001/api/leads?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLeads(data.data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, [filterStatus, filterEngagement, debouncedSearchQuery]);

  // ✅ FETCH STATS - Only once on mount and when needed
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/leads/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ✅ FETCH FUNNEL - Only once on mount and when needed
  const fetchFunnelData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/leads/funnel');
      const data = await response.json();

      if (data.success) {
        setFunnelData(data.data);
      }
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    }
  };

  // ✅ FETCH STATS & FUNNEL ONLY ON MOUNT
  useEffect(() => {
    fetchStats();
    fetchFunnelData();
  }, []); // Empty dependency array = runs once on mount

  // ✅ FETCH LEADS WHEN FILTERS OR DEBOUNCED SEARCH CHANGES
  useEffect(() => {
    if (!isAddModalOpen) {
      fetchLeads();
    }
  }, [fetchLeads, isAddModalOpen]);

  // Handle add lead
  const handleAddLead = async () => {
    if (!newLead.email || !newLead.name) {
      alert('Email and Name are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLead),
      });

      const data = await response.json();

      if (data.success) {
        alert('Lead added successfully!');
        setIsAddModalOpen(false);
        resetForm();
        fetchLeads();
        fetchStats();
        fetchFunnelData();
      } else {
        alert(data.message || 'Error adding lead');
      }
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Error adding lead');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewLead({
      email: '',
      name: '',
      company: '',
      status: 'New',
      score: 0,
      engagement: 'None',
      tags: []
    });
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newLead.tags.includes(tagInput.trim())) {
      setNewLead({
        ...newLead,
        tags: [...newLead.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewLead({
      ...newLead,
      tags: newLead.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Hot Lead':
        return 'bg-red-100 text-red-800';
      case 'Replied':
        return 'bg-green-100 text-green-800';
      case 'Cold Lead':
        return 'bg-blue-100 text-blue-800';
      case 'New':
        return 'bg-gray-100 text-gray-800';
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

  // Export CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Email', 'Name', 'Company', 'Added Date', 'Campaigns', 'Last Campaign', 'Status', 'Score', 'Engagement', 'Tags'];
      const rows = leads.map(lead => [
        lead.email,
        lead.name,
        lead.company || '',
        lead.added_date,
        lead.campaigns,
        lead.last_campaign || '',
        lead.status,
        lead.score,
        lead.engagement,
        lead.tags && lead.tags.length > 0 ? lead.tags.join(';') : ''
      ]);

      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        const escapedRow = row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        });
        csvContent += escapedRow.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV');
    }
  };

  // Export Selected Leads
  const handleExportSelected = () => {
    try {
      const selectedLeadsData = leads.filter(lead => selectedLeads.includes(lead.id));

      if (selectedLeadsData.length === 0) {
        alert('No leads selected');
        return;
      }

      const headers = ['Email', 'Name', 'Company', 'Added Date', 'Campaigns', 'Last Campaign', 'Status', 'Score', 'Engagement', 'Tags'];
      const rows = selectedLeadsData.map(lead => [
        lead.email,
        lead.name,
        lead.company || '',
        lead.added_date,
        lead.campaigns,
        lead.last_campaign || '',
        lead.status,
        lead.score,
        lead.engagement,
        lead.tags && lead.tags.length > 0 ? lead.tags.join(';') : ''
      ]);

      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        const escapedRow = row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        });
        csvContent += escapedRow.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `selected_leads_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`${selectedLeadsData.length} leads exported successfully!`);
    } catch (error) {
      console.error('Error exporting selected leads:', error);
      alert('Error exporting selected leads');
    }
  };

  // Handle Import CSV
  const handleImportCSV = async () => {
    if (!importFile) {
      alert('Please select a CSV file');
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('http://localhost:3001/api/leads/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully imported ${data.imported} leads!`);
        setIsImportModalOpen(false);
        setImportFile(null);
        fetchLeads();
        fetchStats();
        fetchFunnelData();
      } else {
        alert(data.message || 'Error importing leads');
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Error importing CSV file');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
    } else {
      alert('Please select a valid CSV file');
      e.target.value = '';
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Leads Management</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300" disabled={isAddModalOpen} onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" className="border-gray-300" disabled={isAddModalOpen} onClick={() => setIsImportModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import Leads
              </Button>
              <Button
                className="text-white font-medium"
                style={{ backgroundColor: '#1e3a8a' }}
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6" style={{ pointerEvents: (isAddModalOpen || isImportModalOpen) ? 'none' : 'auto' }}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold" style={{ color: '#012970' }}>
                    {stats.total_leads.toLocaleString()}
                  </p>
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
                  <p className="text-2xl font-bold text-red-600">{stats.hot_leads}</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
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
                  <p className="text-2xl font-bold" style={{ color: '#012970' }}>{stats.avg_score}</p>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && debouncedSearchQuery !== searchQuery && (
                  <span className="absolute right-3 top-3 text-xs text-gray-400">Searching...</span>
                )}
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="Hot Lead">Hot Leads</SelectItem>
                  <SelectItem value="Replied">Replied</SelectItem>
                  <SelectItem value="Cold Lead">Cold Leads</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEngagement} onValueChange={setFilterEngagement}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by engagement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Engagement</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="None">None</SelectItem>
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
                <Button size="sm" variant="outline" className="border-gray-300" onClick={handleExportSelected}>
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
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeads(leads.map(lead => lead.id));
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
                {leads.map((lead) => (
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
                    <TableCell className="text-gray-900">{lead.company || '-'}</TableCell>
                    <TableCell className="text-gray-600">{lead.added_date}</TableCell>
                    <TableCell className="text-center">{lead.campaigns}</TableCell>
                    <TableCell className="text-gray-600">{lead.last_campaign || '-'}</TableCell>
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
                        {lead.tags && lead.tags.length > 0 ? (
                          lead.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))
                        ) : '-'}
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
                    Total Leads: {funnelData.total_leads}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-yellow-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${funnelData.total_leads > 0 ? (funnelData.engaged / funnelData.total_leads * 100) : 0}%` }}
                  >
                    Engaged: {funnelData.engaged}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-green-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${funnelData.total_leads > 0 ? (funnelData.qualified / funnelData.total_leads * 100) : 0}%` }}
                  >
                    Qualified: {funnelData.qualified}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-purple-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${funnelData.total_leads > 0 ? (funnelData.converted / funnelData.total_leads * 100) : 0}%` }}
                  >
                    Converted: {funnelData.converted}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Add Lead Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen} modal={true}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the details of the new lead below.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newLead.status} onValueChange={(value) => setNewLead({ ...newLead, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Cold Lead">Cold Lead</SelectItem>
                    <SelectItem value="Hot Lead">Hot Lead</SelectItem>
                    <SelectItem value="Replied">Replied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="engagement">Engagement</Label>
                <Select value={newLead.engagement} onValueChange={(value) => setNewLead({ ...newLead, engagement: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={newLead.score}
                onChange={(e) => setNewLead({ ...newLead, score: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddTag();
                    }
                  }}
                  autoComplete="off"
                />
                <Button type="button" onClick={handleAddTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newLead.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddLead}
              disabled={loading}
              style={{ backgroundColor: '#1e3a8a' }}
              className="text-white"
            >
              {loading ? 'Adding...' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Lead Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen} modal={true}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import leads. The file should have the following columns: Email, Name, Company, Status, Score, Engagement, Tags
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="csv-file">CSV File *</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {importFile && (
                <p className="text-sm text-gray-600">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">CSV Format Example:</h4>
              <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                Email,Name,Company,Status,Score,Engagement,Tags{'\n'}
                john@example.com,John Doe,Acme Inc,New,50,Medium,Enterprise;SaaS{'\n'}
                jane@company.com,Jane Smith,Tech Corp,Hot Lead,85,High,B2B
              </pre>
              <p className="text-xs text-gray-600 mt-2">
                • Email and Name are required<br />
                • Multiple tags should be separated by semicolon (;)<br />
                • Valid Status: New, Cold Lead, Hot Lead, Replied<br />
                • Valid Engagement: None, Low, Medium, High
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportModalOpen(false); setImportFile(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={importLoading || !importFile}
              style={{ backgroundColor: '#1e3a8a' }}
              className="text-white"
            >
              {importLoading ? 'Importing...' : 'Import Leads'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadsPage;