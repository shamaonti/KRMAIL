
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/LogoutButton";
import { 
  Mail, 
  Plus, 
  Inbox, 
  Users, 
  FileText,
  Menu,
  Home,
  Settings,
  BarChart3,
  Send
} from "lucide-react";
import { Link } from 'react-router-dom';
import CampaignPage from './dashboard/CampaignPage';
import InboxAdditionPage from './dashboard/InboxAdditionPage';
import MailBoxPage from './dashboard/MailBoxPage';
import LeadsPage from './dashboard/LeadsPage';
import EmailTemplatesPage from './dashboard/EmailTemplatesPage';
import SettingsPage from './dashboard/SettingsPage';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-nunito font-bold" style={{ color: '#012970' }}>MarketSkrap</h1>
        </div>
        <nav className="mt-6">
          <div className="px-3">
            <div className="space-y-1">
              <Link to="/dashboard">
                <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
                  <Home className="mr-3 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/dashboard/campaign">
                <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
                  <Mail className="mr-3 h-4 w-4" />
                  Campaign
                </Button>
              </Link>
              <Link to="/dashboard/inbox-addition">
                <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
                  <Plus className="mr-3 h-4 w-4" />
                  Inbox Addition
                </Button>
              </Link>
              <Link to="/dashboard/mailbox">
                <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
                  <Inbox className="mr-3 h-4 w-4" />
                  Mail Box
                </Button>
              </Link>
              <Link to="/dashboard/leads">
                <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
                  <Users className="mr-3 h-4 w-4" />
                  Leads
                </Button>
              </Link>
              <Link to="/dashboard/email-templates">
                <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
                  <FileText className="mr-3 h-4 w-4" />
                  Email Templates
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-200 px-3">
            <Link to="/dashboard/settings">
              <Button variant="ghost" className="w-full justify-start hover:bg-blue-50 hover:text-blue-700">
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
  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Dashboard Overview</h2>
            <Link to="/dashboard/campaign">
              <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#012970' }}>12</div>
              <p className="text-xs text-gray-500">+2 from last month</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#012970' }}>2,847</div>
              <p className="text-xs text-gray-500">+180 from last month</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Emails Sent</CardTitle>
              <Send className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#012970' }}>15,234</div>
              <p className="text-xs text-gray-500">+1,201 from last month</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Open Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#012970' }}>24.5%</div>
              <p className="text-xs text-gray-500">+2.1% from last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="font-nunito" style={{ color: '#012970' }}>Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Welcome Series</p>
                    <p className="text-sm text-gray-500">Started 2 days ago</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Product Launch</p>
                    <p className="text-sm text-gray-500">Started 1 week ago</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Completed</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Newsletter</p>
                    <p className="text-sm text-gray-500">Started 3 days ago</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="font-nunito" style={{ color: '#012970' }}>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link to="/dashboard/campaign">
                  <Button className="w-full justify-start text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
                    <Mail className="mr-2 h-4 w-4" />
                    Create New Campaign
                  </Button>
                </Link>
                <Link to="/dashboard/inbox-addition">
                  <Button variant="outline" className="w-full justify-start border-gray-300 hover:bg-gray-50">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Email Account
                  </Button>
                </Link>
                <Link to="/dashboard/email-templates">
                  <Button variant="outline" className="w-full justify-start border-gray-300 hover:bg-gray-50">
                    <FileText className="mr-2 h-4 w-4" />
                    Create Email Template
                  </Button>
                </Link>
                <Link to="/dashboard/leads">
                  <Button variant="outline" className="w-full justify-start border-gray-300 hover:bg-gray-50">
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
