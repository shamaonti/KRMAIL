import React, { useMemo, useRef, useState } from 'react';
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
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const [searchText, setSearchText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);

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

  const [leads, setLeads] = useState(mockLeads);

  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    company: "",
    status: "Cold Lead",
    engagement: "Low",
    score: 50,
    tags: ""
  });

  const getStatusColor = (status: string) => {
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

  const getEngagementColor = (engagement: string) => {
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

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const escapeCSV = (value: any) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleExportCSV = () => {
    const header = [
      "id",
      "name",
      "email",
      "company",
      "addedDate",
      "campaigns",
      "lastCampaign",
      "status",
      "score",
      "engagement",
      "tags"
    ];

    const rows = leads.map(l => ([
      l.id,
      l.name,
      l.email,
      l.company,
      l.addedDate,
      l.campaigns,
      l.lastCampaign,
      l.status,
      l.score,
      l.engagement,
      (l.tags || []).join("|")
    ]));

    const csv = [
      header.join(","),
      ...rows.map(r => r.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${todayISO()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];

    const splitLine = (line: string) => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };

    const header = splitLine(lines[0]).map(h => h.trim());
    const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iName = idx("name");
    const iEmail = idx("email");
    const iCompany = idx("company");
    const iStatus = idx("status");
    const iScore = idx("score");
    const iEngagement = idx("engagement");
    const iTags = idx("tags");

    if (iEmail === -1) return [];

    const items: any[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = splitLine(lines[r]);
      const email = cols[iEmail] || "";
      if (!email) continue;

      items.push({
        name: iName !== -1 ? (cols[iName] || "") : "",
        email,
        company: iCompany !== -1 ? (cols[iCompany] || "") : "",
        status: iStatus !== -1 ? (cols[iStatus] || "Cold Lead") : "Cold Lead",
        score: iScore !== -1 ? Number(cols[iScore] || 50) : 50,
        engagement: iEngagement !== -1 ? (cols[iEngagement] || "Low") : "Low",
        tags: iTags !== -1 ? (cols[iTags] || "") : ""
      });
    }
    return items;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const parsed = parseCSV(text);

      if (!parsed.length) {
        alert("No valid leads found in CSV. Make sure your CSV has an email column.");
        return;
      }

      setLeads(prev => {
        const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0);
        let nextId = maxId + 1;

        const existingEmails = new Set(prev.map(x => (x.email || "").toLowerCase()));

        const newRows = parsed
          .filter(p => !existingEmails.has((p.email || "").toLowerCase()))
          .map(p => ({
            id: nextId++,
            email: p.email,
            name: p.name || "Unknown",
            company: p.company || "",
            addedDate: todayISO(),
            campaigns: 0,
            lastCampaign: "-",
            status: p.status || "Cold Lead",
            score: Number.isFinite(p.score) ? p.score : 50,
            engagement: p.engagement || "Low",
            tags: String(p.tags || "")
              .split(/[|,]/)
              .map((t: string) => t.trim())
              .filter(Boolean)
          }));

        return [...newRows, ...prev];
      });

      alert("Import success ✅");
    } catch (err) {
      console.error(err);
      alert("Import failed ❌ Check your CSV format.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLead.email.trim()) {
      alert("Email is required");
      return;
    }

    setLeads(prev => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0);
      const exists = prev.some(x => (x.email || "").toLowerCase() === newLead.email.trim().toLowerCase());
      if (exists) {
        alert("This email already exists.");
        return prev;
      }

      const row = {
        id: maxId + 1,
        name: newLead.name.trim() || "Unknown",
        email: newLead.email.trim(),
        company: newLead.company.trim(),
        addedDate: todayISO(),
        campaigns: 0,
        lastCampaign: "-",
        status: newLead.status,
        score: Number(newLead.score) || 50,
        engagement: newLead.engagement,
        tags: String(newLead.tags || "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      };

      return [row, ...prev];
    });

    setIsAddOpen(false);
    setNewLead({
      name: "",
      email: "",
      company: "",
      status: "Cold Lead",
      engagement: "Low",
      score: 50,
      tags: ""
    });
  };

  const visibleLeads = useMemo(() => {
    let data = leads;

    if (filterStatus === "hot") data = data.filter(l => l.status === "Hot Lead");
    if (filterStatus === "replied") data = data.filter(l => l.status === "Replied");
    if (filterStatus === "cold") data = data.filter(l => l.status === "Cold Lead");

    const q = searchText.trim().toLowerCase();
    if (q) {
      data = data.filter(l =>
        (l.email || "").toLowerCase().includes(q) ||
        (l.name || "").toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [leads, filterStatus, searchText]);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Leads Management</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }} onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Import Leads
              </Button>
              <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }} onClick={() => setIsAddOpen(true)}>
                Add Lead
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportFile}
              />
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
                  <p className="text-2xl font-bold" style={{ color: '#012970' }}>{leads.length.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-red-600">{leads.filter(l => l.status === "Hot Lead").length.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-green-600">{leads.filter(l => l.status === "Replied").length.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold" style={{ color: '#012970' }}>
                    {Math.round(leads.reduce((s, l) => s + (Number(l.score) || 0), 0) / Math.max(leads.length, 1))}
                  </p>
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
                <Input
                  placeholder="Search leads by email, name, or company..."
                  className="pl-10"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
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
                      checked={selectedLeads.length === visibleLeads.length && visibleLeads.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeads(visibleLeads.map(lead => lead.id));
                        } else {
                          setSelectedLeads([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Lead Information</TableHead>
                  <TableHead>Company</TableHead>

                  {/* ✅ keep header one line */}
                  <TableHead className="whitespace-nowrap">Added Date</TableHead>

                  <TableHead>Campaigns</TableHead>

                  {/* ✅ keep header one line */}
                  <TableHead className="whitespace-nowrap">Last Campaign</TableHead>

                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleLeads.map((lead) => (
                  <TableRow key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
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

                    {/* ✅ one line date */}
                    <TableCell className="text-gray-600 whitespace-nowrap">{lead.addedDate}</TableCell>

                    <TableCell className="text-center">{lead.campaigns}</TableCell>

                    {/* ✅ one line date */}
                    <TableCell className="text-gray-600 whitespace-nowrap">{lead.lastCampaign}</TableCell>

                    <TableCell>
                      {/* ✅ status badge forced one line */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
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
                      {/* ✅ tags forced one line (no wrapping) */}
                      <div className="flex flex-nowrap gap-1 whitespace-nowrap overflow-hidden">
                        {lead.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded whitespace-nowrap"
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
                    Total Leads: {leads.length.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-yellow-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '60%' }}>
                    Engaged: {Math.round(leads.length * 0.6).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-green-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '30%' }}>
                    Qualified: {Math.round(leads.length * 0.3).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div className="bg-purple-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ width: '15%' }}>
                    Converted: {Math.round(leads.length * 0.15).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Add Lead Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: '#012970' }}>Add Lead</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setIsAddOpen(false)}>
                ✕
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddLeadSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Company</Label>
                  <Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} />
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={newLead.status}
                    onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                  >
                    <option>Hot Lead</option>
                    <option>Replied</option>
                    <option>Cold Lead</option>
                  </select>
                </div>

                <div>
                  <Label>Engagement</Label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={newLead.engagement}
                    onChange={(e) => setNewLead({ ...newLead, engagement: e.target.value })}
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div>
                  <Label>Score</Label>
                  <Input
                    type="number"
                    value={newLead.score as any}
                    onChange={(e) => setNewLead({ ...newLead, score: e.target.value as any })}
                  />
                </div>

                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={newLead.tags}
                    onChange={(e) => setNewLead({ ...newLead, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="border-gray-300" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
                  Save Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadsPage;