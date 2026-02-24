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
  opened_count?: number;
  clicked_count?: number;
  status?: string;
};

type DashboardOverview = {
  activeCampaigns: number;
  totalLeads: number;
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

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200">
        {/* ✅ FIX: Sidebar header height fixed & centered */}
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

  const fetchOverview = async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/dashboard/overview`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Dashboard API failed with ${res.status}`);
      }

      const data: DashboardOverview = await res.json();
      setOverview(data);
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
    const id = setInterval(fetchOverview, 15000);
    return () => clearInterval(id);
  }, []);

  const recentCampaigns = useMemo(
    () => overview?.recentCampaigns || [],
    [overview]
  );

  return (
    <>
      {/* ✅ FIX: Header height fixed & centered (single line) */}
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

      {/* ✅ keep error BELOW header so header stays single line */}
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
                Active Campaigns
              </CardTitle>
              <Mail className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                style={{ color: "#012970" }}
              >
                {loading ? "…" : formatNumber(overview?.activeCampaigns ?? 0)}
              </div>
              <p className="text-xs text-gray-500">Live from database</p>
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
              <div
                className="text-2xl font-bold"
                style={{ color: "#012970" }}
              >
                {loading ? "…" : formatNumber(overview?.totalLeads ?? 0)}
              </div>
              <p className="text-xs text-gray-500">Live from database</p>
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
              <div
                className="text-2xl font-bold"
                style={{ color: "#012970" }}
              >
                {loading ? "…" : formatNumber(overview?.emailsSent ?? 0)}
              </div>
              <p className="text-xs text-gray-500">Live from database</p>
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
              <div
                className="text-2xl font-bold"
                style={{ color: "#012970" }}
              >
                {loading ? "…" : `${overview?.openRate ?? 0}%`}
              </div>
              <p className="text-xs text-gray-500">Live from database</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Campaigns */}
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
                  {recentCampaigns.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {c.campaign_name
                            ? c.campaign_name
                            : `Campaign #${c.id}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          Opens: {c.opened_count ?? 0} • Clicks:{" "}
                          {c.clicked_count ?? 0}
                        </p>
                      </div>

                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {c.status ? c.status : "Live"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
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