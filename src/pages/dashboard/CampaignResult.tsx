import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Send
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
interface FollowupStep {
  followup_order: number;
  followup_subject: string;
  total: number;
  sent: number;
  pending: number;
  failed: number;
}
interface Campaign {
  id: number;
  userId: number;
  name: string;
  subject: string;
  content?: string;
  templateId?: number;
  status: string;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  scheduledAt?: string;
  createdAt: string;
  hasFollowup?: boolean;
  followupTemplateId?: number;
  followupSubject?: string;
  followupDelayHours?: number;
  followupCondition?: string;
}

// ✅ safe number helper (prevents NaN)
function toNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ✅ safe parse id from route
function parseCampaignId(idParam: string | undefined): number | null {
  if (!idParam) return null;
  const n = Number(idParam);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const CampaignResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [followupStats, setFollowupStats] = useState<FollowupStep[]>([]);
  const [followupDetails, setFollowupDetails] = useState<any[]>([]);
const [showFollowupDetails, setShowFollowupDetails] = useState<number | null>(null);
const [followupDetailsPage, setFollowupDetailsPage] = useState(1);
const FOLLOWUP_PAGE_SIZE = 10;

  const fetchCampaignDetails = async (campaignId: number) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`);
      const data = await response.json();

      if (data.success) {
        const c = data.data || {};

        // ✅ normalize numeric fields (avoid undefined -> NaN)
        const normalized: Campaign = {
          id: toNum(c.id),
          userId: toNum(c.userId),
          name: c.name ?? '',
          subject: c.subject ?? '',
          content: c.content ?? undefined,
          templateId: c.templateId != null ? toNum(c.templateId) : undefined,
          status: c.status ?? 'draft',
          totalRecipients: toNum(c.totalRecipients),
          sentCount: toNum(c.sentCount),
          openedCount: toNum(c.openedCount),
          clickedCount: toNum(c.clickedCount),
          bouncedCount: toNum(c.bouncedCount),
          unsubscribedCount: toNum(c.unsubscribedCount),
          scheduledAt: c.scheduledAt ?? undefined,
          createdAt: c.createdAt ?? new Date().toISOString(),
          hasFollowup: Boolean(c.hasFollowup),
          followupTemplateId: c.followupTemplateId != null ? toNum(c.followupTemplateId) : undefined,
          followupSubject: c.followupSubject ?? undefined,
          followupDelayHours: c.followupDelayHours != null ? toNum(c.followupDelayHours) : undefined,
          followupCondition: c.followupCondition ?? undefined,
        };

        setCampaign(normalized);
      } else {
        setError(data.message || 'Campaign not found');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Failed to load campaign details');
    } finally {
      setIsLoading(false);
    }
  };
const fetchFollowupStats = async (campaignId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/followup-stats`);
      const data = await res.json();
      // ✅ now data.data is an array of steps
      if (data.success) setFollowupStats(data.data || []);
    } catch (err) {
      console.error('Followup stats error:', err);
    }
  };
  const fetchFollowupDetails = async (campaignId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/followup-details`);
      const data = await res.json();
      if (data.success) setFollowupDetails(data.data);
    } catch (err) {
      console.error('Followup details error:', err);
    }
  };
  useEffect(() => {
    const campaignId = parseCampaignId(id);
    if (!campaignId) {
      setIsLoading(false);
      setError('Invalid campaign id');
      return;
    }
    fetchCampaignDetails(campaignId);
    fetchFollowupStats(campaignId);
    fetchFollowupDetails(campaignId);
  }, [id]);

  // ✅ Safe numeric locals
  const sent = toNum(campaign?.sentCount);
  const opened = toNum(campaign?.openedCount);
  const clicked = toNum(campaign?.clickedCount);
  const bounced = toNum(campaign?.bouncedCount);
  const unsub = toNum(campaign?.unsubscribedCount);
  const total = toNum(campaign?.totalRecipients);

  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';
  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0.0';
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : '0.0';
  const unsubRate = sent > 0 ? ((unsub / sent) * 100).toFixed(1) : '0.0';

  const deliveryRate = total > 0
    ? (((sent - bounced) / total) * 100).toFixed(1)
    : '0.0';

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
    > = {
      draft: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      scheduled: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
      sending: { variant: "default", icon: <Send className="h-3 w-3 mr-1 animate-pulse" /> },
      sent: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[(status || '').toLowerCase()] || { variant: "secondary" as const, icon: null };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 capitalize">
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm border-b">
          <div className="px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/campaign')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </div>
        </header>
        <main className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Campaign not found'}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-foreground">
                    {campaign.name}
                  </h1>
                  {getStatusBadge(campaign.status)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Subject: {campaign.subject}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/campaign')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Campaign Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Campaign Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recipients</p>
                <p className="font-medium">{total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Follow-up Enabled</p>
                <p className="font-medium">{campaign.hasFollowup ? 'Yes' : 'No'}</p>
              </div>
              {campaign.scheduledAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled For</p>
                  <p className="font-medium">{new Date(campaign.scheduledAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ✅ Compact Stats Row (no scroll, 5 in one line) */}
        <div className="grid grid-cols-5 gap-3">
          {/* Sent */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Emails Sent</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{sent}</h3>
                  <p className="text-xs text-muted-foreground mt-1">of {total}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {total > 0 ? ((sent / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <Progress value={total > 0 ? (sent / total) * 100 : 0} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Opened */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Opened</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{opened}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{openRate}% open</p>
                </div>
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Open Rate</span>
                  <span className="font-medium text-green-600">{openRate}%</span>
                </div>
                <Progress value={parseFloat(openRate)} className="h-1.5 [&>div]:bg-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Clicked */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Clicked</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{clicked}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{clickRate}% click</p>
                </div>
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MousePointerClick className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Click Rate</span>
                  <span className="font-medium text-blue-600">{clickRate}%</span>
                </div>
                <Progress value={parseFloat(clickRate)} className="h-1.5 [&>div]:bg-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Bounced */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Bounced</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{bounced}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{bounceRate}% bounce</p>
                </div>
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Bounce</span>
                  <span className="font-medium text-red-600">{bounceRate}%</span>
                </div>
                <Progress value={parseFloat(bounceRate)} className="h-1.5 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>

          {/* Unsubscribed */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Unsubscribed</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{unsub}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{unsubRate}% unsub</p>
                </div>
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Unsub</span>
                  <span className="font-medium text-red-600">{unsubRate}%</span>
                </div>
                <Progress value={parseFloat(unsubRate)} className="h-1.5 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className="text-4xl font-bold text-primary">{deliveryRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">Delivery Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sent - bounced} of {total} delivered
                </p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className="text-4xl font-bold text-green-600">{openRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">Open Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {opened} of {sent} opened
                </p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className="text-4xl font-bold text-blue-600">{clickRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">Click-Through Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {clicked} of {sent} clicked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
{/* Follow-up Settings */}
        {campaign.hasFollowup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Follow-up Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium">{campaign.followupSubject || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delay</p>
                  <p className="font-medium">
                    {campaign.followupDelayHours != null
                      ? `${campaign.followupDelayHours} hours`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <p className="font-medium capitalize">
                    {campaign.followupCondition?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Follow-up Tracking */}
        {campaign.hasFollowup && followupStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-black" />
                Follow-up Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* ✅ Each followup shown separately with its own name */}
              {followupStats.map((step) => (
                <div key={step.followup_order}
                  className="border rounded-lg p-4 bg-gray-50">

                  {/* Followup name + number */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 flex items-center justify-center
                      bg-purple-600 text-white rounded-full text-xs font-bold">
                      {step.followup_order}
                    </span>
                    <p className="text-sm font-semibold">
                      {step.followup_subject || `Followup #${step.followup_order}`}
                    </p>
                  </div>

                  {/* Tracking numbers */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-black">{step.total}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total Queued</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{step.sent}</div>
                      <p className="text-xs text-muted-foreground mt-1">Sent</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{step.pending}</div>
                      <p className="text-xs text-muted-foreground mt-1">Pending</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{step.failed}</div>
                      <p className="text-xs text-muted-foreground mt-1">Failed</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {step.total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-purple-600">
                          {((step.sent / step.total) * 100).toFixed(1)}% sent
                        </span>
                      </div>
                      <Progress
                        value={(step.sent / step.total) * 100}
                        className="h-2 [&>div]:bg-purple-500"
                      />
                    </div>
                  )}

                  {/* ✅ View Details Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowFollowupDetails(
                        prev => prev === step.followup_order ? null : step.followup_order
                      )}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      {showFollowupDetails === step.followup_order ? "Hide Details ▲" : "View Details ▼"}
                    </button>
                  </div>

                  {/* ✅ Details Table - only for this step */}
                  {showFollowupDetails === step.followup_order && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm border rounded-lg overflow-hidden">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-3 font-medium text-black">#</th>
                            <th className="text-left p-3 font-medium text-black">Email</th>
                            <th className="text-left p-3 font-medium text-black">Subject</th>
                            <th className="text-left p-3 font-medium text-black">Status</th>
                            <th className="text-left p-3 font-medium text-black">Scheduled At</th>
                            <th className="text-left p-3 font-medium text-black">Sent At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {followupDetails
                            .filter(row => row.followup_order === step.followup_order)
                            .slice(
                              (followupDetailsPage - 1) * FOLLOWUP_PAGE_SIZE,
                              followupDetailsPage * FOLLOWUP_PAGE_SIZE
                            )
                            .map((row, i) => (
                              <tr key={i} className="border-t hover:bg-gray-50">
                                <td className="p-3 text-muted-foreground">
                                  {(followupDetailsPage - 1) * FOLLOWUP_PAGE_SIZE + i + 1}
                                </td>
                                <td className="p-3 font-mono text-xs">{row.email}</td>
                                <td className="p-3 text-xs">{row.followup_subject || '-'}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    row.status === 'sent'    ? 'bg-green-100 text-green-700' :
                                    row.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    row.status === 'failed'  ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {row.status === 'sent'    ? '✅ Sent' :
                                     row.status === 'pending' ? '⏳ Pending' :
                                     row.status === 'failed'  ? '❌ Failed' : row.status}
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">
                                  {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '-'}
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">
                                  {row.sent_at ? new Date(row.sent_at).toLocaleString() : '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              ))}

            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CampaignResult;