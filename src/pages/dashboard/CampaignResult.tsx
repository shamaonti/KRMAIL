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
  Users,
  TrendingUp,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Send
} from "lucide-react";

const API_BASE_URL = 'http://localhost:3001';

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
  scheduledAt?: string;
  createdAt: string;
  hasFollowup?: boolean;
  followupTemplateId?: number;
  followupSubject?: string;
  followupDelayHours?: number;
  followupCondition?: string;
}

const CampaignResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 1;
  };

  const fetchCampaignDetails = async (campaignId: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`);
      const data = await response.json();

      if (data.success) {
        setCampaign(data.data);
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

  useEffect(() => {
    if (id) {
      fetchCampaignDetails(id);
    }
  }, [id]);

  const openRate = campaign && campaign.sentCount > 0
    ? ((campaign.openedCount / campaign.sentCount) * 100).toFixed(1)
    : '0.0';

  const clickRate = campaign && campaign.sentCount > 0
    ? ((campaign.clickedCount / campaign.sentCount) * 100).toFixed(1)
    : '0.0';

  const bounceRate = campaign && campaign.sentCount > 0
    ? ((campaign.bouncedCount / campaign.sentCount) * 100).toFixed(1)
    : '0.0';

  const deliveryRate = campaign && campaign.totalRecipients > 0
    ? (((campaign.sentCount - campaign.bouncedCount) / campaign.totalRecipients) * 100).toFixed(1)
    : '0.0';

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      draft: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      scheduled: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
      sending: { variant: "default", icon: <Send className="h-3 w-3 mr-1 animate-pulse" /> },
      sent: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    
    const config = statusConfig[status.toLowerCase()] || { variant: "secondary" as const, icon: null };
    
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
                <p className="font-medium">{campaign.totalRecipients}</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sent */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                  <h3 className="text-3xl font-bold mt-2 text-foreground">{campaign.sentCount}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    of {campaign.totalRecipients} recipients
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Send className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {campaign.totalRecipients > 0 
                      ? ((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(0) 
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={campaign.totalRecipients > 0 
                    ? (campaign.sentCount / campaign.totalRecipients) * 100 
                    : 0} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Opened */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Opened</p>
                  <h3 className="text-3xl font-bold mt-2 text-foreground">{campaign.openedCount}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {openRate}% open rate
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Open Rate</span>
                  <span className="font-medium text-green-600">{openRate}%</span>
                </div>
                <Progress value={parseFloat(openRate)} className="h-2 [&>div]:bg-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Clicked */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clicked</p>
                  <h3 className="text-3xl font-bold mt-2 text-foreground">{campaign.clickedCount}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {clickRate}% click rate
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MousePointerClick className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Click Rate</span>
                  <span className="font-medium text-blue-600">{clickRate}%</span>
                </div>
                <Progress value={parseFloat(clickRate)} className="h-2 [&>div]:bg-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Bounced */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bounced</p>
                  <h3 className="text-3xl font-bold mt-2 text-foreground">{campaign.bouncedCount}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bounceRate}% bounce rate
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Bounce Rate</span>
                  <span className="font-medium text-red-600">{bounceRate}%</span>
                </div>
                <Progress value={parseFloat(bounceRate)} className="h-2 [&>div]:bg-red-500" />
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
                  {campaign.sentCount - campaign.bouncedCount} of {campaign.totalRecipients} delivered
                </p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className="text-4xl font-bold text-green-600">{openRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">Open Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {campaign.openedCount} of {campaign.sentCount} opened
                </p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className="text-4xl font-bold text-blue-600">{clickRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">Click-Through Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {campaign.clickedCount} of {campaign.sentCount} clicked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Follow-up Settings (if enabled) */}
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
                    {campaign.followupDelayHours 
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
      </main>
    </div>
  );
};

export default CampaignResult;
