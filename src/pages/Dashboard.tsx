import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/LogoutButton";
import {
  Mail, Plus, Inbox, Users, FileText, Home, Settings, BarChart3, Send, RefreshCw,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import CampaignPage from "./dashboard/CampaignPage";
import InboxAdditionPage from "./dashboard/InboxAdditionPage";
import MailBoxPage from "./dashboard/MailBoxPage";
import LeadsPage from "./dashboard/LeadsPage";
import EmailTemplatesPage from "./dashboard/EmailTemplatesPage";
import SettingsPage from "./dashboard/SettingsPage";
import CampaignResult from "./dashboard/CampaignResult";

// ─── HeaderAction type & Context (defined here, exported for child pages) ──────
export type HeaderAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
};

type HeaderActionsCtx = { setHeaderActions: (a: HeaderAction[]) => void };

export const HeaderActionsContext = createContext<HeaderActionsCtx>({ setHeaderActions: () => {} });
export const useHeaderActions = () => useContext(HeaderActionsContext);

// ─── Types ─────────────────────────────────────────────────────────────────────
type RecentCampaign = {
  id: number; campaign_name?: string; created_at?: string; scheduled_at?: string;
  opened_count?: number; clicked_count?: number; sent_count?: number;
  responded_count?: number; total_recipients?: number; status?: string;
};
type DashboardOverview = {
  activeCampaigns: number; totalLeads: number; emailsSent: number;
  openRate: number; recentCampaigns: RecentCampaign[];
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatNumber = (n: number) => { try { return new Intl.NumberFormat().format(n); } catch { return String(n); } };
const safeJsonParse = <T,>(s: string | null, fallback: T): T => { try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; } };
const toNum = (v: any): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const getCurrentUserId = () => { const user = safeJsonParse<{ id?: number }>(localStorage.getItem("user"), {}); return toNum(user?.id) ?? 1; };
const formatDate = (dt?: string) => { if (!dt) return "-"; const d = new Date(dt); if (Number.isNaN(d.getTime())) return "-"; return d.toLocaleDateString("en-IN"); };
const formatTime = (dt?: string) => { if (!dt) return "-"; const d = new Date(dt); if (Number.isNaN(d.getTime())) return "-"; return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); };
const pct = (num: number, den: number) => { if (!den || den <= 0) return 0; const v = (num / den) * 100; return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0; };

// ─── Page title map ────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/dashboard/campaign": "Campaign Management",
  "/dashboard/inbox-addition": "Inbox Addition",
  "/dashboard/mailbox": "Mail Box",
  "/dashboard/leads": "Data Management",
  "/dashboard/email-templates": "Email Templates",
  "/dashboard/settings": "Settings",
};
const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/dashboard/campaign-result/")) return "Campaign Result";
  return "Dashboard";
};

// ─── Top Header ────────────────────────────────────────────────────────────────
const TopHeader: React.FC<{ headerActions: HeaderAction[] }> = ({ headerActions }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = safeJsonParse<{ id?: number; name?: string; email?: string }>(localStorage.getItem("user"), {});
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U";
  const [profileOpen, setProfileOpen] = useState(false);
  const pageTitle = getPageTitle(location.pathname);
  const handleLogout = () => { localStorage.removeItem("user"); navigate("/auth"); };

  return (
    <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
      <h2 className="text-xl font-semibold" style={{ color: "#012970" }}>{pageTitle}</h2>
      <div className="flex items-center gap-2">
        {headerActions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? "outline"}
            disabled={action.disabled}
            className={action.variant === "default" ? "text-white font-medium" : "border-gray-300"}
            style={action.variant === "default" ? { backgroundColor: "#1e3a8a" } : {}}
            onClick={action.onClick}
          >
            {action.icon && <span className="mr-2 flex items-center">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
        <div className="relative ml-1">
          <button
            onClick={() => setProfileOpen(prev => !prev)}
            className="w-9 h-9 rounded-full bg-green-500 text-white font-bold flex items-center justify-center text-sm hover:bg-green-600"
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute top-11 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-48 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
              </div>
              <div className="py-1">
                <Link to="/dashboard/settings" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="h-4 w-4" /> My Account
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);
  const cls = (path: string) =>
    `w-full justify-start ${isActive(path) ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-blue-50 hover:text-blue-700"}`;

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200 z-50">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-nunito font-bold" style={{ color: "#012970" }}>KRMail</h1>
      </div>
      <nav className="mt-6">
        <div className="px-3 space-y-1">
          <Link to="/dashboard"><Button variant="ghost" className={cls("/dashboard")}><Home className="mr-3 h-4 w-4" />Dashboard</Button></Link>
          <Link to="/dashboard/campaign"><Button variant="ghost" className={cls("/dashboard/campaign")}><Mail className="mr-3 h-4 w-4" />Campaign</Button></Link>
          <Link to="/dashboard/inbox-addition"><Button variant="ghost" className={cls("/dashboard/inbox-addition")}><Plus className="mr-3 h-4 w-4" />Inbox Addition</Button></Link>
          <Link to="/dashboard/mailbox"><Button variant="ghost" className={cls("/dashboard/mailbox")}><Inbox className="mr-3 h-4 w-4" />Mail Box</Button></Link>
          <Link to="/dashboard/leads"><Button variant="ghost" className={cls("/dashboard/leads")}><Users className="mr-3 h-4 w-4" />Leads</Button></Link>
          <Link to="/dashboard/email-templates"><Button variant="ghost" className={cls("/dashboard/email-templates")}><FileText className="mr-3 h-4 w-4" />Email Templates</Button></Link>
        </div>
        <div className="mt-8 pt-4 border-t border-gray-200 px-3">
          <Link to="/dashboard/settings"><Button variant="ghost" className={cls("/dashboard/settings")}><Settings className="mr-3 h-4 w-4" />Settings</Button></Link>
          <LogoutButton variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" />
        </div>
      </nav>
    </div>
  );
};

// ─── Main Dashboard Layout ─────────────────────────────────────────────────────
const Dashboard = () => {
  const [headerActions, setHeaderActions] = useState<HeaderAction[]>([]);
  const location = useLocation();

  useEffect(() => { setHeaderActions([]); }, [location.pathname]);

  return (
    <HeaderActionsContext.Provider value={{ setHeaderActions }}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <TopHeader headerActions={headerActions} />
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/campaign" element={<CampaignPage />} />
            <Route path="/campaign-result/:id" element={<CampaignResult />} />
            <Route path="/inbox-addition" element={<InboxAdditionPage />} />
            <Route path="/mailbox" element={<MailBoxPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/email-templates" element={<EmailTemplatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </HeaderActionsContext.Provider>
  );
};

// ─── Dashboard Home ────────────────────────────────────────────────────────────
const DashboardHome = () => {
  const { setHeaderActions } = useHeaderActions();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentCampaignsOverride, setRecentCampaignsOverride] = useState<RecentCampaign[] | null>(null);
  const navigate = useNavigate();

  const fetchFromCampaigns = async () => {
    try {
      const userId = getCurrentUserId();
      const res = await fetch(`${API_BASE}/api/campaigns?userId=${userId}`, { credentials: "include" });
      if (!res.ok) return;
      const payload = await res.json();
      if (!payload?.success || !Array.isArray(payload?.data)) return;
      const normalized = (payload.data as any[]).map((c) => ({
        id: Number(c.id),
        campaign_name: c.name ?? c.campaign_name ?? c.title ?? undefined,
        status: c.status,
        created_at: c.createdAt ?? c.created_at ?? undefined,
        scheduled_at: c.scheduledAt ?? c.scheduled_at ?? undefined,
        opened_count: Number(c.openedCount ?? c.opened_count ?? 0),
        clicked_count: Number(c.clickedCount ?? c.clicked_count ?? 0),
        sent_count: Number(c.sentCount ?? c.sent_count ?? 0),
        total_recipients: Number(c.totalRecipients ?? c.total_recipients ?? 0),
        responded_count: Number(c.respondedCount ?? c.repliedCount ?? c.replyCount ?? 0),
      }));
      setRecentCampaignsOverride(
        [...normalized]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 5)
      );
    } catch { /* silent */ }
  };

  const fetchOverview = async () => {
    try {
      setError(null); setLoading(true);
      const userId = getCurrentUserId();
      const res = await fetch(`${API_BASE}/api/dashboard/overview?userId=${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Dashboard API failed with ${res.status}`);
      setOverview(await res.json());
      await fetchFromCampaigns();
    } catch (e: any) {
      setOverview(null); setError(e?.message || "Failed to load dashboard");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOverview(); }, []);

  useEffect(() => {
    setHeaderActions([
      { label: "Refresh", variant: "outline", icon: <RefreshCw className="h-4 w-4" />, onClick: fetchOverview, disabled: loading },
      { label: "New Campaign", variant: "default", icon: <Plus className="h-4 w-4" />, onClick: () => navigate("/dashboard/campaign") },
    ]);
  }, [loading]);

  const recentCampaigns = useMemo(() => recentCampaignsOverride ?? overview?.recentCampaigns ?? [], [overview, recentCampaignsOverride]);

  return (
    <main className="p-6">
      {error && <p className="text-sm text-red-600 mb-4">Error: {error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Total Campaigns", value: loading ? "…" : formatNumber(overview?.activeCampaigns ?? 0), sub: "Total campaigns", icon: <Mail className="h-4 w-4 text-gray-400" /> },
          { title: "Total Leads",     value: loading ? "…" : formatNumber(overview?.totalLeads ?? 0),       sub: "Leads from Leads page",    icon: <Users className="h-4 w-4 text-gray-400" /> },
          { title: "Emails Sent",     value: loading ? "…" : formatNumber(overview?.emailsSent ?? 0),       sub: "Mail Box received",        icon: <Send className="h-4 w-4 text-gray-400" /> },
          { title: "Open Rate",       value: loading ? "…" : `${overview?.openRate ?? 0}%`,                sub: "Live from database",       icon: <BarChart3 className="h-4 w-4 text-gray-400" /> },
        ].map((card) => (
          <Card key={card.title} className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#012970" }}>{card.value}</div>
              <p className="text-xs text-gray-500">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader><CardTitle className="font-nunito" style={{ color: "#012970" }}>Recent Campaigns</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-gray-500">Loading…</p>
              : recentCampaigns.length === 0 ? <p className="text-sm text-gray-500">No campaigns found.</p>
              : (
                <div className="space-y-4">
                  {recentCampaigns.map((c, idx) => {
                    const total = c.total_recipients ?? 0;
                    const leadsProcessed = (c.sent_count ?? 0) > 0 ? c.sent_count ?? 0 : total;
                    return (
                      <div key={c.id} className="flex items-start justify-between">
                        <div className="pr-4">
                          <p className="font-medium text-gray-900">{idx + 1}. {c.campaign_name || `Campaign #${c.id}`}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Start: {formatDate(c.created_at)} • End: {formatDate(c.scheduled_at)} • Time: {formatTime(c.scheduled_at || c.created_at)} • Leads: {formatNumber(leadsProcessed)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Responded: {pct(c.responded_count ?? 0, total)}% • Open: {pct(c.opened_count ?? 0, total)}% • Click: {pct(c.clicked_count ?? 0, total)}%
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap">{c.status || "Live"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader><CardTitle className="font-nunito" style={{ color: "#012970" }}>Quick Actions</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-4">
              <Link to="/dashboard/campaign"><Button className="w-full justify-start h-11 px-4 text-white font-medium" style={{ backgroundColor: "#1e3a8a" }}><Mail className="mr-2 h-4 w-4" />Create New Campaign</Button></Link>
              <Link to="/dashboard/inbox-addition"><Button variant="outline" className="w-full justify-start h-11 px-4 border-gray-300 hover:bg-gray-50"><Plus className="mr-2 h-4 w-4" />Add Email Account</Button></Link>
              <Link to="/dashboard/email-templates"><Button variant="outline" className="w-full justify-start h-11 px-4 border-gray-300 hover:bg-gray-50"><FileText className="mr-2 h-4 w-4" />Create Email Template</Button></Link>
              <Link to="/dashboard/leads"><Button variant="outline" className="w-full justify-start h-11 px-4 border-gray-300 hover:bg-gray-50"><Users className="mr-2 h-4 w-4" />Import Leads</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Dashboard;