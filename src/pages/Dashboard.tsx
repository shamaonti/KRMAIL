import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/LogoutButton";
import {
  Mail,
  Plus,
  Inbox,
  Users,
  FileText,
  Home,
  Settings,
  BarChart3,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import CampaignPage from "./dashboard/CampaignPage";
import InboxAdditionPage from "./dashboard/InboxAdditionPage";
import MailBoxPage from "./dashboard/MailBoxPage";
import LeadsPage from "./dashboard/LeadsPage";
import EmailTemplatesPage from "./dashboard/EmailTemplatesPage";
import SettingsPage from "./dashboard/SettingsPage";
import CampaignResult from "./dashboard/CampaignResult";

type RecentCampaign = {
  id: number;
  campaign_name?: string;
  created_at?: string;
  scheduled_at?: string;
  opened_count?: number;
  clicked_count?: number;
  sent_count?: number;
  responded_count?: number;
  total_recipients?: number;
  status?: string;
};

type DashboardOverview = {
  // NOTE: frontend key remains the same to avoid breaking anything.
  // Backend should return TOTAL campaigns in this field.
  activeCampaigns: number;

  // Backend should return COUNT(*) from `leads`
  totalLeads: number;

  // Backend should return COUNT(*) from `inbox_emails` (received emails)
  emailsSent: number;

  openRate: number;
  recentCampaigns: RecentCampaign[];
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const formatNumber = (n: number) => {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
};

const safeJsonParse = <T,>(s: string | null, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

const toNum = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getCurrentUserId = () => {
  const user = safeJsonParse<{ id?: number }>(localStorage.getItem("user"), {});
  return toNum(user?.id) ?? 1;
};

const formatDate = (dt?: string) => {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
};

const formatTime = (dt?: string) => {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const pct = (num: number, den: number) => {
  if (!den || den <= 0) return 0;
  const v = (num / den) * 100;
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0; // 1 decimal
};

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1
            className="text-xl font-nunito font-bold"
            style={{ color: "#012970" }}
          >
            KRMail
          </h1>
        </div>

        <nav className="mt-6">
          <div className="px-3">
            <div className="space-y-1">
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                >
                  <Home className="mr-3 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              <Link to="/dashboard/campaign">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                >
                  <Mail className="mr-3 h-4 w-4" />
                  Campaign
                </Button>
              </Link>

              <Link to="/dashboard/inbox-addition">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                >
                  <Plus className="mr-3 h-4 w-4" />
                  Inbox Addition
                </Button>
              </Link>

              <Link to="/dashboard/mailbox">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                >
                  <Inbox className="mr-3 h-4 w-4" />
                  Mail Box
                </Button>
              </Link>

              <Link to="/dashboard/leads">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                >
                  <Users className="mr-3 h-4 w-4" />
                  Leads
                </Button>
              </Link>

              <Link to="/dashboard/email-templates">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                >
                  <FileText className="mr-3 h-4 w-4" />
                  Email Templates
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200 px-3">
            <Link to="/dashboard/settings">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </Button>
            </Link>

            <LogoutButton
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            />
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64">
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
  );
};

const DashboardHome = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // We ONLY keep this override for recent campaigns list.
  // Counts (campaigns/leads/emails) must come from backend dashboard overview.
  const [recentCampaignsOverride, setRecentCampaignsOverride] = useState<
    RecentCampaign[] | null
  >(null);

  const fetchFromCampaigns = async () => {
    try {
      const userId = getCurrentUserId();

      const res = await fetch(`${API_BASE}/api/campaigns?userId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const payload = await res.json();
      if (!payload?.success || !Array.isArray(payload?.data)) return;

      const campaigns = payload.data as any[];

      const normalized = campaigns.map((c) => ({
        id: Number(c.id),
        campaign_name: c.name ?? c.campaign_name ?? c.title ?? undefined,
        status: c.status,
        created_at: c.createdAt ?? c.created_at ?? undefined,
        scheduled_at: c.scheduledAt ?? c.scheduled_at ?? undefined,
        opened_count: Number(c.openedCount ?? c.opened_count ?? 0),
        clicked_count: Number(c.clickedCount ?? c.clicked_count ?? 0),
        sent_count: Number(c.sentCount ?? c.sent_count ?? 0),
        total_recipients: Number(c.totalRecipients ?? c.total_recipients ?? 0),

        responded_count: Number(
          c.respondedCount ??
            c.repliedCount ??
            c.replyCount ??
            c.responded_count ??
            c.replied_count ??
            c.reply_count ??
            0
        ),
      }));

      // Recent campaigns list = ALL campaigns (latest first)
      const recentAll: RecentCampaign[] = [...normalized]
        .sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          campaign_name: c.campaign_name,
          created_at: c.created_at,
          scheduled_at: c.scheduled_at,
          opened_count: c.opened_count,
          clicked_count: c.clicked_count,
          sent_count: c.sent_count,
          responded_count: c.responded_count,
          total_recipients: c.total_recipients,
          status: c.status,
        }));

      setRecentCampaignsOverride(recentAll);
    } catch {
      // silent fallback
    }
  };

  const fetchOverview = async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/dashboard/overview`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Dashboard API failed with ${res.status}`);

      const data: DashboardOverview = await res.json();
      setOverview(data);

      // Keep only for recent campaigns list
      await fetchFromCampaigns();
    } catch (e: any) {
      console.error("Dashboard fetch error:", e);
      setOverview(null);
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // IMPORTANT:
  // activeCampaignsValue is now TOTAL campaigns (backend should return total campaigns in this field)
  const totalCampaignsValue = overview?.activeCampaigns ?? 0;
  const totalLeadsValue = overview?.totalLeads ?? 0;

  // Emails Sent card now shows received emails count from mailbox (backend should return COUNT(inbox_emails))
  const emailsSentValue = overview?.emailsSent ?? 0;

  const recentCampaigns = useMemo(() => {
    return recentCampaignsOverride ?? overview?.recentCampaigns ?? [];
  }, [overview, recentCampaignsOverride]);

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center">
        <div className="px-6 w-full flex items-center justify-between">
          <h2
            className="text-2xl font-nunito font-semibold"
            style={{ color: "#012970" }}
          >
            Dashboard Overview
          </h2>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
              onClick={fetchOverview}
              disabled={loading}
              title="Refresh live data"
            >
              Refresh
            </Button>

            <Link to="/dashboard/campaign">
              <Button
                className="text-white font-medium"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="px-6 pt-2">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      ) : null}

      <main className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Campaigns
              </CardTitle>
              <Mail className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#012970" }}>
                {loading ? "…" : formatNumber(totalCampaignsValue)}
              </div>
              <p className="text-xs text-gray-500">Total campaigns (from database)</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Leads
              </CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#012970" }}>
                {loading ? "…" : formatNumber(totalLeadsValue)}
              </div>
              <p className="text-xs text-gray-500">Leads from Leads page</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Emails Sent
              </CardTitle>
              <Send className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#012970" }}>
                {loading ? "…" : formatNumber(emailsSentValue)}
              </div>
              <p className="text-xs text-gray-500">Mail Box (received emails)</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Open Rate
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#012970" }}>
                {loading ? "…" : `${overview?.openRate ?? 0}%`}
              </div>
              <p className="text-xs text-gray-500">Live from database</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Campaigns (NO headings, list like screenshot) */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="font-nunito" style={{ color: "#012970" }}>
                Recent Campaigns
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-sm text-gray-500">
                  Loading recent campaigns…
                </div>
              ) : recentCampaigns.length === 0 ? (
                <div className="text-sm text-gray-500">No campaigns found.</div>
              ) : (
                <div className="space-y-4">
                  {recentCampaigns.map((c, idx) => {
                    const startDate = c.created_at;
                    const endDate = c.scheduled_at;
                    const timeValue = c.scheduled_at || c.created_at;

                    const total = c.total_recipients ?? 0;
                    const opened = c.opened_count ?? 0;
                    const clicked = c.clicked_count ?? 0;
                    const responded = c.responded_count ?? 0;

                    const openRate = pct(opened, total);
                    const clickRate = pct(clicked, total);
                    const respondedRate = pct(responded, total);

                    const leadsProcessed =
                      (c.sent_count ?? 0) > 0
                        ? c.sent_count ?? 0
                        : c.total_recipients ?? 0;

                    return (
                      <div
                        key={c.id}
                        className="flex items-start justify-between"
                      >
                        <div className="pr-4">
                          <p className="font-medium text-gray-900">
                            {idx + 1}.{" "}
                            {c.campaign_name ? c.campaign_name : `Campaign #${c.id}`}
                          </p>

                          <p className="text-sm text-gray-500 mt-1">
                            Start: {formatDate(startDate)} • End: {formatDate(endDate)} •
                            Time: {formatTime(timeValue)} • Leads processed:{" "}
                            {formatNumber(leadsProcessed)}
                          </p>

                          <p className="text-sm text-gray-500 mt-1">
                            Responded Rate: {respondedRate}% • Open Rate: {openRate}% •
                            Click Rate: {clickRate}%
                          </p>
                        </div>

                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {c.status ? c.status : "Live"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions (unchanged) */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="font-nunito" style={{ color: "#012970" }}>
                Quick Actions
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="space-y-4">
                <Link to="/dashboard/campaign">
                  <Button
                    className="w-full justify-start h-11 px-4 text-white font-medium"
                    style={{ backgroundColor: "#1e3a8a" }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Create New Campaign
                  </Button>
                </Link>

                <Link to="/dashboard/inbox-addition">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-11 px-4 border-gray-300 hover:bg-gray-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Email Account
                  </Button>
                </Link>

                <Link to="/dashboard/email-templates">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-11 px-4 border-gray-300 hover:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create Email Template
                  </Button>
                </Link>

                <Link to="/dashboard/leads">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-11 px-4 border-gray-300 hover:bg-gray-50"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Import Leads
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default Dashboard;