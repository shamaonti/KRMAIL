// Campaign management functionality
import { Lead, EmailResult, CampaignAnalytics } from './email';
import { EmailTemplate } from './templates';

export interface Campaign {
  id: string;
  userId: number;
  name: string;
  subject: string;
  templateId: number;
  template: EmailTemplate;
  leads: Lead[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledAt?: string;
  sentAt?: string;
  results?: EmailResult[];
  analytics?: CampaignAnalytics;
  settings: {
    timezone: string;
    sendingHours: {
      from: string;
      to: string;
    };
    abTesting: boolean;
    delayBetweenEmails: number;
  };
  followupSettings?: {
    enabled: boolean;
    templateId?: number;
    template?: EmailTemplate;
    subject?: string;
    delayHours: number;
    condition: 'not_opened' | 'not_clicked' | 'always';
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmailSequence {
  id: string;
  templateId: number;
  template: EmailTemplate;
  sendAfterDays: number;
  conditions: {
    requireOpen: boolean;
    requireClick: boolean;
  };
}

const CAMPAIGNS_STORAGE_KEY = 'mailskrap_campaigns_data';

// Generate unique campaign ID
const generateCampaignId = (): string => {
  return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get all campaigns for a user
export const getUserCampaigns = (userId: number): Campaign[] => {
  const campaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
  const allCampaigns = campaigns ? JSON.parse(campaigns) : [];
  return allCampaigns.filter((campaign: Campaign) => campaign.userId === userId);
};

// Get a specific campaign
export const getCampaign = (campaignId: string): Campaign | null => {
  const campaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
  const allCampaigns = campaigns ? JSON.parse(campaigns) : [];
  return allCampaigns.find((campaign: Campaign) => campaign.id === campaignId) || null;
};

// Create a new campaign
export const createCampaign = (
  userId: number,
  name: string,
  subject: string,
  template: EmailTemplate,
  leads: Lead[],
  settings?: Partial<Campaign['settings']>,
  followupSettings?: Campaign['followupSettings']
): Campaign => {
  const campaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
  const allCampaigns = campaigns ? JSON.parse(campaigns) : [];
  
  const defaultSettings: Campaign['settings'] = {
    timezone: 'UTC',
    sendingHours: {
      from: '09:00',
      to: '17:00'
    },
    abTesting: false,
    delayBetweenEmails: 200
  };

  const newCampaign: Campaign = {
    id: generateCampaignId(),
    userId,
    name,
    subject,
    templateId: template.id,
    template,
    leads,
    status: 'draft',
    settings: { ...defaultSettings, ...settings },
    followupSettings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  allCampaigns.push(newCampaign);
  localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(allCampaigns));
  
  return newCampaign;
};

// Update campaign
export const updateCampaign = (
  campaignId: string,
  updates: Partial<Campaign>
): Campaign => {
  const campaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
  const allCampaigns = campaigns ? JSON.parse(campaigns) : [];
  
  const campaignIndex = allCampaigns.findIndex((c: Campaign) => c.id === campaignId);
  if (campaignIndex === -1) {
    throw new Error('Campaign not found');
  }

  allCampaigns[campaignIndex] = {
    ...allCampaigns[campaignIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(allCampaigns));
  return allCampaigns[campaignIndex];
};

// Delete campaign
export const deleteCampaign = (campaignId: string): boolean => {
  const campaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
  const allCampaigns = campaigns ? JSON.parse(campaigns) : [];
  
  const filteredCampaigns = allCampaigns.filter((c: Campaign) => c.id !== campaignId);
  localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(filteredCampaigns));
  
  return true;
};

// Update campaign results
export const updateCampaignResults = (
  campaignId: string,
  results: EmailResult[],
  analytics: CampaignAnalytics
): Campaign => {
  return updateCampaign(campaignId, {
    status: 'sent',
    sentAt: new Date().toISOString(),
    results,
    analytics
  });
};

// Get campaign analytics summary
export const getCampaignAnalytics = (campaignId: string): CampaignAnalytics | null => {
  const campaign = getCampaign(campaignId);
  return campaign?.analytics || null;
};

// Get all campaign analytics for a user
export const getUserCampaignAnalytics = (userId: number): CampaignAnalytics[] => {
  const campaigns = getUserCampaigns(userId);
  return campaigns
    .filter(campaign => campaign.analytics)
    .map(campaign => campaign.analytics!)
    .sort((a, b) => new Date(b.sentAt || '').getTime() - new Date(a.sentAt || '').getTime());
};

// Get overall analytics for a user
export const getOverallAnalytics = (userId: number): CampaignAnalytics => {
  const analytics = getUserCampaignAnalytics(userId);
  
  if (analytics.length === 0) {
    return {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalReplies: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      replyRate: 0
    };
  }

  const totalSent = analytics.reduce((sum, a) => sum + a.totalSent, 0);
  const totalOpened = analytics.reduce((sum, a) => sum + a.totalOpened, 0);
  const totalClicked = analytics.reduce((sum, a) => sum + a.totalClicked, 0);
  const totalBounced = analytics.reduce((sum, a) => sum + a.totalBounced, 0);
  const totalReplies = analytics.reduce((sum, a) => sum + a.totalReplies, 0);

  return {
    totalSent,
    totalOpened,
    totalClicked,
    totalBounced,
    totalReplies,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    replyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0
  };
};

// Validate campaign before sending
export const validateCampaign = (campaign: Campaign): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!campaign.name.trim()) {
    errors.push('Campaign name is required');
  }

  if (!campaign.subject.trim()) {
    errors.push('Email subject is required');
  }

  if (!campaign.template) {
    errors.push('Email template is required');
  }

  if (!campaign.leads || campaign.leads.length === 0) {
    errors.push('At least one lead is required');
  }

  const validLeads = campaign.leads.filter(lead => lead.email && lead.email.includes('@'));
  if (validLeads.length === 0) {
    errors.push('At least one valid email address is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
