import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Eye, 
  MousePointer, 
  MessageSquare, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { CampaignAnalytics } from "@/lib/email";

interface CampaignAnalyticsProps {
  analytics: CampaignAnalytics;
  previousAnalytics?: CampaignAnalytics;
  showTrends?: boolean;
}

const CampaignAnalyticsComponent: React.FC<CampaignAnalyticsProps> = ({
  analytics,
  previousAnalytics,
  showTrends = false
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendValue = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+∞' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const metrics = [
    {
      title: 'Emails Sent',
      value: formatNumber(analytics.totalSent),
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: showTrends && previousAnalytics ? getTrendValue(analytics.totalSent, previousAnalytics.totalSent) : undefined
    },
    {
      title: 'Opens',
      value: formatNumber(analytics.totalOpened),
      percentage: formatPercentage(analytics.openRate),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: showTrends && previousAnalytics ? getTrendValue(analytics.openRate, previousAnalytics.openRate) : undefined
    },
    {
      title: 'Clicks',
      value: formatNumber(analytics.totalClicked),
      percentage: formatPercentage(analytics.clickRate),
      icon: MousePointer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: showTrends && previousAnalytics ? getTrendValue(analytics.clickRate, previousAnalytics.clickRate) : undefined
    },
    {
      title: 'Replies',
      value: formatNumber(analytics.totalReplies),
      percentage: formatPercentage(analytics.replyRate),
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: showTrends && previousAnalytics ? getTrendValue(analytics.replyRate, previousAnalytics.replyRate) : undefined
    },
    {
      title: 'Bounces',
      value: formatNumber(analytics.totalBounced),
      percentage: formatPercentage(analytics.bounceRate),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: showTrends && previousAnalytics ? getTrendValue(analytics.bounceRate, previousAnalytics.bounceRate) : undefined
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                {showTrends && metric.trend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(
                      metric.title === 'Emails Sent' ? analytics.totalSent : 
                      metric.title === 'Opens' ? analytics.openRate :
                      metric.title === 'Clicks' ? analytics.clickRate :
                      metric.title === 'Replies' ? analytics.replyRate :
                      analytics.bounceRate,
                      metric.title === 'Emails Sent' ? (previousAnalytics?.totalSent || 0) : 
                      metric.title === 'Opens' ? (previousAnalytics?.openRate || 0) :
                      metric.title === 'Clicks' ? (previousAnalytics?.clickRate || 0) :
                      metric.title === 'Replies' ? (previousAnalytics?.replyRate || 0) :
                      (previousAnalytics?.bounceRate || 0)
                    )}
                    <span className="text-xs font-medium text-gray-600">
                      {metric.trend}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  {metric.percentage && (
                    <Badge variant="secondary" className="text-xs">
                      {metric.percentage}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Rates */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Performance Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Open Rate</span>
                <span className="font-medium">{formatPercentage(analytics.openRate)}</span>
              </div>
              <Progress value={analytics.openRate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Click Rate</span>
                <span className="font-medium">{formatPercentage(analytics.clickRate)}</span>
              </div>
              <Progress value={analytics.clickRate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reply Rate</span>
                <span className="font-medium">{formatPercentage(analytics.replyRate)}</span>
              </div>
              <Progress value={analytics.replyRate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bounce Rate</span>
                <span className="font-medium">{formatPercentage(analytics.bounceRate)}</span>
              </div>
              <Progress value={analytics.bounceRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Engagement Summary */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Engagement Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalSent > 0 ? Math.round((analytics.totalOpened / analytics.totalSent) * 100) : 0}
                </div>
                <div className="text-sm text-gray-600">Engagement Score</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.totalSent > 0 ? Math.round((analytics.totalClicked / analytics.totalSent) * 100) : 0}
                </div>
                <div className="text-sm text-gray-600">Click Score</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Engagement</span>
                <span className="font-medium">
                  {formatNumber(analytics.totalOpened + analytics.totalClicked + analytics.totalReplies)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Rate</span>
                <span className="font-medium">
                  {analytics.totalSent > 0 ? formatPercentage(((analytics.totalSent - analytics.totalBounced) / analytics.totalSent) * 100) : '0%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalSent)}</div>
              <div className="text-sm text-gray-600">Total Sent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatNumber(analytics.totalOpened)}</div>
              <div className="text-sm text-gray-600">Opened</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{formatNumber(analytics.totalClicked)}</div>
              <div className="text-sm text-gray-600">Clicked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{formatNumber(analytics.totalBounced)}</div>
              <div className="text-sm text-gray-600">Bounced</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignAnalyticsComponent;
