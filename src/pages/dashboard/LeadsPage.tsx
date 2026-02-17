import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Eye,
} from "lucide-react";

/**
 * ✅ Only change: Removed mock data, wired to LIVE backend.
 * ✅ UI/design is unchanged.
 * ✅ Buttons are wired: fetch, export, export selected, import (bulk), add lead, add tag (selected), delete.
 */

type UiLead = {
  id: number;
  email: string;
  name: string;
  company: string;
  addedDate: string;
  campaigns: number;
  lastCampaign: string;
  status: string;
  score: number;
  engagement: string;
  tags: string[];
};

// Backend row shape (based on your /api/leads screenshot)
type ApiLead = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  status?: string | null;
  engagement?: string | null;
  score?: number | string | null;
  tags?: string | null; // often comma or pipe separated
  created_at?: string | null;
};

const LeadsPage = () => {
  // ✅ set this to your backend URL (env first)
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEngagement, setFilterEngagement] = useState("all");
  const [searchText, setSearchText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [tagToAdd, setTagToAdd] = useState("");

  const [leads, setLeads] = useState<UiLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    company: "",
    status: "Cold Lead",
    engagement: "Low",
    score: 50,
    tags: "",
  });

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const normalizeStatus = (s: string | null | undefined) => {
    const v = String(s || "").trim();
    if (!v) return "Cold Lead";
    // allow backend values like "Hot", "Cold"
    if (v.toLowerCase() === "hot") return "Hot Lead";
    if (v.toLowerCase() === "cold") return "Cold Lead";
    return v; // "Replied", "Hot Lead", etc.
  };

  const normalizeEngagement = (e: string | null | undefined) => {
    const v = String(e || "").trim();
    if (!v) return "Low";
    // keep as High/Medium/Low
    if (v.toLowerCase() === "high") return "High";
    if (v.toLowerCase() === "medium") return "Medium";
    if (v.toLowerCase() === "low") return "Low";
    return v;
  };

  const deriveNameFromEmail = (email: string) => {
    const local = (email || "").split("@")[0] || "";
    if (!local) return "Unknown";
    const parts = local
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean);
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    return parts.map(cap).join(" ") || "Unknown";
  };

  const parseTags = (t: any): string[] => {
    if (!t) return [];
    if (Array.isArray(t)) return t.map(String).filter(Boolean);
    const s = String(t);
    return s
      .split(/[|,]/)
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const mapApiToUi = (row: ApiLead): UiLead => {
    const first = String(row.first_name || "").trim();
    const last = String(row.last_name || "").trim();
    const full = `${first} ${last}`.trim();

    const created = row.created_at ? String(row.created_at) : "";
    const addedDate = created ? created.slice(0, 10) : todayISO();

    return {
      id: Number(row.id),
      email: String(row.email || "").trim(),
      name: full || deriveNameFromEmail(String(row.email || "")),
      company: String(row.company || "").trim(),
      addedDate,
      campaigns: 0,
      lastCampaign: "-",
      status: normalizeStatus(row.status),
      score: Number(row.score ?? 50) || 50,
      engagement: normalizeEngagement(row.engagement),
      tags: parseTags(row.tags),
    };
  };

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || `Request failed: ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  };

  // ✅ FETCH LEADS (LIVE)
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const data = (await apiFetch("/api/leads", { method: "GET" })) as ApiLead[];
      const ui = Array.isArray(data) ? data.map(mapApiToUi) : [];
      setLeads(ui);
      setSelectedLeads([]);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to fetch leads ❌\n${e?.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hot Lead":
      case "Hot":
        return "bg-red-100 text-red-800";
      case "Replied":
        return "bg-green-100 text-green-800";
      case "Cold Lead":
      case "Cold":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case "High":
        return "text-green-600";
      case "Medium":
        return "text-yellow-600";
      case "Low":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // CSV helpers
  const escapeCSV = (value: any) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // ✅ Export ALL (current leads in UI)
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
      "tags",
    ];

    const rows = leads.map((l) => [
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
      (l.tags || []).join("|"),
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Export SELECTED
  const handleExportSelectedCSV = () => {
    const selected = leads.filter((l) => selectedLeads.includes(l.id));
    if (!selected.length) return;

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
      "tags",
    ];

    const rows = selected.map((l) => [
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
      (l.tags || []).join("|"),
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_leads_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Parse CSV (same as your version)
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
      return out.map((s) => s.trim());
    };

    const header = splitLine(lines[0]).map((h) => h.trim());
    const idx = (name: string) =>
      header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

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
        name: iName !== -1 ? cols[iName] || "" : "",
        email,
        company: iCompany !== -1 ? cols[iCompany] || "" : "",
        status: iStatus !== -1 ? cols[iStatus] || "Cold Lead" : "Cold Lead",
        score: iScore !== -1 ? Number(cols[iScore] || 50) : 50,
        engagement: iEngagement !== -1 ? cols[iEngagement] || "Low" : "Low",
        tags: iTags !== -1 ? cols[iTags] || "" : "",
      });
    }
    return items;
  };

  // ✅ Import CSV -> LIVE backend bulk endpoint
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

      // Convert to what backend usually expects
      const payloadLeads = parsed.map((p: any) => {
        const fullName = String(p.name || "").trim();
        const [first_name, ...rest] = fullName.split(" ");
        const last_name = rest.join(" ").trim();

        return {
          email: String(p.email || "").trim(),
          first_name: first_name ? String(first_name).trim() : "",
          last_name: last_name ? String(last_name).trim() : "",
          company: String(p.company || "").trim(),
          status: normalizeStatus(p.status),
          engagement: normalizeEngagement(p.engagement),
          score: Number(p.score ?? 50) || 50,
          tags: String(p.tags || "")
            .split(/[|,]/)
            .map((t: string) => t.trim())
            .filter(Boolean)
            .join(","), // send as string
        };
      });

      await apiFetch("/api/leads/bulk", {
        method: "POST",
        body: JSON.stringify({ leads: payloadLeads }),
      });

      await fetchLeads();
      alert("Import success ✅");
    } catch (err: any) {
      console.error(err);
      alert(`Import failed ❌\n${err?.message || err}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ✅ Add Lead -> LIVE backend
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLead.email.trim()) {
      alert("Email is required");
      return;
    }

    try {
      const full = newLead.name.trim();
      const [first_name, ...rest] = full.split(" ");
      const last_name = rest.join(" ").trim();

      await apiFetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          email: newLead.email.trim(),
          first_name: first_name || "",
          last_name: last_name || "",
          company: newLead.company.trim(),
          status: normalizeStatus(newLead.status),
          engagement: normalizeEngagement(newLead.engagement),
          score: Number(newLead.score) || 50,
          tags: String(newLead.tags || "")
            .split(/[|,]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .join(","),
        }),
      });

      await fetchLeads();

      setIsAddOpen(false);
      setNewLead({
        name: "",
        email: "",
        company: "",
        status: "Cold Lead",
        engagement: "Low",
        score: 50,
        tags: "",
      });
    } catch (err: any) {
      console.error(err);
      alert(`Save lead failed ❌\n${err?.message || err}`);
    }
  };

  // ✅ Add tag to selected -> tries backend PUT, then refresh
  const applyTagToSelected = async () => {
    const t = tagToAdd.trim();
    if (!t) return alert("Enter a tag first");
    if (!selectedLeads.length) return alert("Select leads first");

    try {
      // If your backend supports bulk tag update, change here.
      // Otherwise, update one by one:
      for (const id of selectedLeads) {
        const lead = leads.find((x) => x.id === id);
        if (!lead) continue;
        const nextTags = Array.from(
          new Set([...(lead.tags || []), t].map((x) => String(x)))
        );

        await apiFetch(`/api/leads/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            tags: nextTags.join(","), // backend-friendly string
          }),
        });
      }

      await fetchLeads();
      setTagToAdd("");
      alert("Tag added ✅");
    } catch (err: any) {
      console.error(err);
      alert(
        `Add tag failed ❌\nYour backend must support PUT /api/leads/:id\n${err?.message || err}`
      );
    }
  };

  // ✅ Delete lead -> LIVE backend
  const deleteLead = async (id: number, email: string) => {
    const ok = confirm(`Delete lead: ${email}?`);
    if (!ok) return;

    try {
      await apiFetch(`/api/leads/${id}`, { method: "DELETE" });
      await fetchLeads();
    } catch (err: any) {
      console.error(err);
      alert(
        `Delete failed ❌\nYour backend must support DELETE /api/leads/:id\n${err?.message || err}`
      );
    }
  };

  // ✅ Visible leads with filters
  const visibleLeads = useMemo(() => {
    let data = leads;

    if (filterStatus === "hot") data = data.filter((l) => normalizeStatus(l.status) === "Hot Lead");
    if (filterStatus === "replied") data = data.filter((l) => normalizeStatus(l.status) === "Replied");
    if (filterStatus === "cold") data = data.filter((l) => normalizeStatus(l.status) === "Cold Lead");

    if (filterEngagement !== "all") {
      const fe = filterEngagement.toLowerCase();
      data = data.filter((l) => String(l.engagement || "").toLowerCase() === fe);
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (l) =>
          (l.email || "").toLowerCase().includes(q) ||
          (l.name || "").toLowerCase().includes(q) ||
          (l.company || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [leads, filterStatus, filterEngagement, searchText]);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: "#012970" }}>
              Data Management
            </h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>

              <Button
                className="text-white font-medium"
                style={{ backgroundColor: "#1e3a8a" }}
                onClick={handleImportClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>

              <Button
                className="text-white font-medium"
                style={{ backgroundColor: "#1e3a8a" }}
                onClick={() => setIsAddOpen(true)}
              >
                Add Data
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

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Data</p>
                  <p className="text-2xl font-bold" style={{ color: "#012970" }}>
                    {leads.length.toLocaleString()}
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
                  <p className="text-2xl font-bold text-red-600">
                    {leads.filter((l) => normalizeStatus(l.status) === "Hot Lead").length.toLocaleString()}
                  </p>
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
                  <p className="text-2xl font-bold text-green-600">
                    {leads.filter((l) => normalizeStatus(l.status) === "Replied").length.toLocaleString()}
                  </p>
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
                  <p className="text-2xl font-bold" style={{ color: "#012970" }}>
                    {Math.round(
                      leads.reduce((s, l) => s + (Number(l.score) || 0), 0) / Math.max(leads.length, 1)
                    )}
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
                  placeholder="Search Data by email, name, or company..."
                  className="pl-10"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="hot">Hot Lead</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="cold">Cold Lead</SelectItem>
                </SelectContent>
              </Select>

              {/* ✅ Engagement filter WORKING */}
              <Select value={filterEngagement} onValueChange={setFilterEngagement}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by engagement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Engagement</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="border-gray-300"
                onClick={() => setIsMoreFiltersOpen((v) => !v)}
              >
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>

            {/* ✅ More Filters panel (same UI style) */}
            {isMoreFiltersOpen && (
              <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <Label className="text-sm text-gray-600">Add tag to selected Data</Label>
                  <Input
                    className="md:w-64"
                    placeholder="e.g. fintech"
                    value={tagToAdd}
                    onChange={(e) => setTagToAdd(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300"
                    onClick={applyTagToSelected}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    Apply Tag
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300"
                    onClick={fetchLeads}
                    disabled={isLoading}
                  >
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </div>
            )}

            {selectedLeads.length > 0 && (
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-sm text-gray-600">{selectedLeads.length} data selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => setIsMoreFiltersOpen(true)}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Add Tag
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300"
                  onClick={handleExportSelectedCSV}
                >
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
                      checked={
                        selectedLeads.length === visibleLeads.length && visibleLeads.length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedLeads(visibleLeads.map((lead) => lead.id));
                        else setSelectedLeads([]);
                      }}
                    />
                  </TableHead>
                  <TableHead>Data Information</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="whitespace-nowrap">Added Date</TableHead>
                  <TableHead>Campaigns</TableHead>
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
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedLeads([...selectedLeads, lead.id]);
                          else setSelectedLeads(selectedLeads.filter((id) => id !== lead.id));
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

                    <TableCell className="text-gray-600 whitespace-nowrap">{lead.addedDate}</TableCell>

                    <TableCell className="text-center">{lead.campaigns}</TableCell>

                    <TableCell className="text-gray-600 whitespace-nowrap">{lead.lastCampaign}</TableCell>

                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                          normalizeStatus(lead.status)
                        )}`}
                      >
                        {normalizeStatus(lead.status)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, Number(lead.score) || 0))}%` }}
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
                      <div className="flex flex-nowrap gap-1 whitespace-nowrap overflow-hidden">
                        {(lead.tags || []).map((tag, index) => (
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
                      {/* ✅ Row action wired: delete */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteLead(lead.id, lead.email)}
                        title="Delete lead"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Empty state */}
                {!visibleLeads.length && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-gray-500">
                      {isLoading ? "Loading..." : "No leads found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lead Funnel Visualization */}
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="font-nunito" style={{ color: "#012970" }}>
              Data Progression Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: "100%" }}
                  >
                    Total Data: {leads.length.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-yellow-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: "60%" }}
                  >
                    Engaged: {Math.round(leads.length * 0.6).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-green-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: "30%" }}
                  >
                    Qualified: {Math.round(leads.length * 0.3).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-8 mr-4">
                  <div
                    className="bg-purple-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: "15%" }}
                  >
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
              <h3 className="text-lg font-semibold" style={{ color: "#012970" }}>
                Add Data
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setIsAddOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddLeadSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Company</Label>
                  <Input
                    value={newLead.company}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  />
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
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-white font-medium" style={{ backgroundColor: "#1e3a8a" }}>
                  Save Data
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
