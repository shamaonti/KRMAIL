import { useEffect, useMemo, useRef, useState } from "react";

type LeadStatus = "Cold" | "Hot" | "Replied";
type LeadEngagement = "Low" | "Medium" | "High";

type Lead = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  status: LeadStatus;
  engagement: LeadEngagement;
  score: number;
  tags: string[];
  createdAt: string; // YYYY-MM-DD
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----------------- DEMO DATA (replace with API fetch later) -----------------
  useEffect(() => {
    setLeads([
      {
        id: 1,
        firstName: "Kavya",
        lastName: "Buva",
        email: "kavya@test.com",
        company: "Wipro",
        status: "Cold",
        engagement: "Low",
        score: 21,
        tags: [],
        createdAt: "2025-12-15",
      },
      {
        id: 2,
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@test.com",
        company: "Smith Corp",
        status: "Cold",
        engagement: "Low",
        score: 10,
        tags: ["trial"],
        createdAt: "2025-12-15",
      },
      {
        id: 3,
        firstName: "Sara",
        lastName: "Wilson",
        email: "sara.wilson@test.com",
        company: "Wilson Ltd",
        status: "Hot",
        engagement: "High",
        score: 85,
        tags: ["enterprise"],
        createdAt: "2025-12-15",
      },
      {
        id: 4,
        firstName: "Amit",
        lastName: "Kumar",
        email: "amit.kumar@test.com",
        company: "TechNova",
        status: "Cold",
        engagement: "Medium",
        score: 40,
        tags: ["india"],
        createdAt: "2025-12-15",
      },
      {
        id: 5,
        firstName: "Priya",
        lastName: "Shah",
        email: "priya.shah@test.com",
        company: "Shah Solutions",
        status: "Replied",
        engagement: "High",
        score: 70,
        tags: ["follow-up"],
        createdAt: "2025-12-15",
      },
      {
        id: 6,
        firstName: "Mike",
        lastName: "Brown",
        email: "mike.brown@test.com",
        company: "Startup.io",
        status: "Cold",
        engagement: "Low",
        score: 45,
        tags: ["tech", "startup"],
        createdAt: "2025-12-15",
      },
      {
        id: 7,
        firstName: "Sarah",
        lastName: "Wilson",
        email: "sarah.wilson@company.com",
        company: "Wilson Corp",
        status: "Replied",
        engagement: "Medium",
        score: 70,
        tags: ["SMB"],
        createdAt: "2025-12-15",
      },
    ]);
  }, []);

  // ----------------- STATS -----------------
  const totalLeads = leads.length;

  const hotLeads = useMemo(
    () => leads.filter((l) => l.status === "Hot").length,
    [leads]
  );

  const repliedLeads = useMemo(
    () => leads.filter((l) => l.status === "Replied").length,
    [leads]
  );

  const avgScore = useMemo(() => {
    if (!totalLeads) return 0;
    const sum = leads.reduce((acc, l) => acc + (Number.isFinite(l.score) ? l.score : 0), 0);
    return Math.round(sum / totalLeads);
  }, [leads, totalLeads]);

  // Funnel (simple, stable defaults)
  const engaged = Math.round(totalLeads * 0.6);
  const qualified = Math.round(totalLeads * 0.3);
  const converted = Math.round(totalLeads * 0.15);

  // ----------------- ACTIONS -----------------
  const handleAddLead = () => {
    // Minimal add lead example (replace with your modal later)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const newLead: Lead = {
      id: Date.now(),
      firstName: "New",
      lastName: "Lead",
      email: `newlead${Date.now()}@test.com`,
      company: "Company",
      status: "Cold",
      engagement: "Low",
      score: 0,
      tags: [],
      createdAt: `${yyyy}-${mm}-${dd}`,
    };

    setLeads((prev) => [newLead, ...prev]);
  };

  const handleExportCSV = () => {
    const headers = ["firstName", "lastName", "email", "company", "status", "engagement", "score", "tags", "createdAt"];
    const rows = leads.map((l) => [
      l.firstName,
      l.lastName,
      l.email,
      l.company,
      l.status,
      l.engagement,
      String(l.score ?? 0),
      (l.tags ?? []).join("|"),
      l.createdAt,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    downloadTextFile(csv, "leads_export.csv", "text/csv;charset=utf-8;");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;

    const text = await file.text();
    const imported = parseCSVToLeads(text);

    if (imported.length === 0) {
      alert("No leads found in CSV. Expected headers: firstName,lastName,email,company,status,engagement,score,tags,createdAt");
      return;
    }

    // Merge: prepend imported (simple)
    setLeads((prev) => [...imported, ...prev]);
  };

  return (
    <div className="p-6 space-y-8">
      {/* ===================== HEADER + ACTIONS ===================== */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads Management</h1>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Export CSV
          </button>

          <button
            onClick={handleImportClick}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Import Leads
          </button>

          <button
            onClick={handleAddLead}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Lead
          </button>

          {/* hidden input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {/* ===================== STATS CARDS ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Leads" value={totalLeads} />
        <StatCard title="Hot Leads" value={hotLeads} />
        <StatCard title="Replied" value={repliedLeads} />
        <StatCard title="Avg. Score" value={avgScore} />
      </div>

      {/* ===================== LEADS TABLE ===================== */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="p-4 border-b text-sm text-gray-600">
          Showing {leads.length} lead{leads.length === 1 ? "" : "s"}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Lead Information</th>
              <th className="p-3">Company</th>
              <th className="p-3">Added Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Score</th>
              <th className="p-3">Engagement</th>
              <th className="p-3">Tags</th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">
                    {lead.firstName} {lead.lastName}
                  </div>
                  <div className="text-xs text-gray-500">{lead.email}</div>
                </td>

                <td className="p-3">{lead.company}</td>
                <td className="p-3">{formatDate(lead.createdAt)}</td>

                <td className="p-3">
                  <span
                    className={[
                      "px-2 py-1 rounded-full text-xs font-medium",
                      lead.status === "Hot"
                        ? "bg-red-100 text-red-700"
                        : lead.status === "Replied"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700",
                    ].join(" ")}
                  >
                    {lead.status}
                  </span>
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-2 bg-blue-600"
                        style={{ width: `${clamp(lead.score, 0, 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums">{lead.score}</span>
                  </div>
                </td>

                <td className="p-3">
                  <span
                    className={[
                      "font-medium",
                      lead.engagement === "High"
                        ? "text-green-600"
                        : lead.engagement === "Medium"
                        ? "text-orange-500"
                        : "text-red-500",
                    ].join(" ")}
                  >
                    {lead.engagement}
                  </span>
                </td>

                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {(lead.tags ?? []).map((tag) => (
                      <span
                        key={`${lead.id}-${tag}`}
                        className="px-2 py-1 rounded bg-gray-100 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}

            {leads.length === 0 && (
              <tr>
                <td className="p-6 text-gray-500" colSpan={7}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===================== LEAD PROGRESSION FUNNEL ===================== */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-6">Lead Progression Funnel</h2>

        <FunnelBar label={`Total Leads: ${totalLeads}`} width={100} barClass="bg-blue-600" />
        <FunnelBar label={`Engaged: ${engaged}`} width={60} barClass="bg-yellow-500" />
        <FunnelBar label={`Qualified: ${qualified}`} width={30} barClass="bg-green-500" />
        <FunnelBar label={`Converted: ${converted}`} width={15} barClass="bg-purple-600" />
      </div>
    </div>
  );
}

/* ===================== UI COMPONENTS ===================== */

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function FunnelBar({
  label,
  width,
  barClass,
}: {
  label: string;
  width: number;
  barClass: string;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-sm font-medium">{label}</div>
      <div className="h-4 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-4 rounded-full ${barClass}`} style={{ width: `${clamp(width, 0, 100)}%` }} />
      </div>
    </div>
  );
}

/* ===================== HELPERS ===================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDate(iso: string) {
  // Accepts YYYY-MM-DD
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${m}/${d}/${y}`;
}

function csvEscape(v: string) {
  const s = v ?? "";
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Expected CSV headers (first row):
 * firstName,lastName,email,company,status,engagement,score,tags,createdAt
 *
 * tags: use "|" separated (e.g. enterprise|SaaS)
 * createdAt: YYYY-MM-DD
 */
function parseCSVToLeads(csvText: string): Lead[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const required = ["firstName", "lastName", "email", "company", "status", "engagement", "score", "tags", "createdAt"];
  const ok = required.every((r) => headers.includes(r));
  if (!ok) return [];

  const idx = (name: string) => headers.indexOf(name);

  const out: Lead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);

    const firstName = cols[idx("firstName")] ?? "";
    const lastName = cols[idx("lastName")] ?? "";
    const email = cols[idx("email")] ?? "";
    const company = cols[idx("company")] ?? "";
    const statusRaw = (cols[idx("status")] ?? "Cold").trim();
    const engagementRaw = (cols[idx("engagement")] ?? "Low").trim();
    const scoreRaw = cols[idx("score")] ?? "0";
    const tagsRaw = cols[idx("tags")] ?? "";
    const createdAt = (cols[idx("createdAt")] ?? "").trim() || "2025-01-01";

    const status = normalizeStatus(statusRaw);
    const engagement = normalizeEngagement(engagementRaw);
    const score = Number(scoreRaw) || 0;
    const tags = tagsRaw
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!email) continue;

    out.push({
      id: Date.now() + i,
      firstName,
      lastName,
      email,
      company,
      status,
      engagement,
      score: clamp(score, 0, 100),
      tags,
      createdAt,
    });
  }

  return out;
}

function normalizeStatus(v: string): LeadStatus {
  const s = v.toLowerCase();
  if (s.includes("hot")) return "Hot";
  if (s.includes("repl")) return "Replied";
  return "Cold";
}

function normalizeEngagement(v: string): LeadEngagement {
  const s = v.toLowerCase();
  if (s.includes("high")) return "High";
  if (s.includes("med")) return "Medium";
  return "Low";
}

// Minimal CSV parser (handles commas and quotes)
function splitCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' && (i === 0 || line[i - 1] !== "\\")) {
      // toggle quotes, but handle double quotes inside
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      res.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  res.push(cur);
  return res;
}
