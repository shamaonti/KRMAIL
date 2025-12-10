const express = require('express');
const router = express.Router();

// In-memory storage for campaigns (replace with database in production)
let campaigns = [];

// GET /api/campaigns - Get all campaigns
router.get('/', (req, res) => {
  try {
    const { userId } = req.query;
    
    let filteredCampaigns = campaigns;
    if (userId) {
      filteredCampaigns = campaigns.filter(campaign => campaign.userId === parseInt(userId));
    }
    
    res.status(200).json({
      success: true,
      message: 'Campaigns retrieved successfully',
      data: filteredCampaigns
    });
    
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/campaigns/:id - Get specific campaign
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Campaign retrieved successfully',
      data: campaign
    });
    
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', (req, res) => {
  try {
    const {
      userId,
      name,
      subject,
      templateId,
      template,
      leads,
      settings = {}
    } = req.body;
    
    // Validation
    if (!userId || !name || !subject || !template || !leads) {
      return res.status(400).json({
        error: 'Missing required fields: userId, name, subject, template, leads'
      });
    }
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        error: 'Leads must be a non-empty array'
      });
    }
    
    // Create campaign
    const campaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: parseInt(userId),
      name,
      subject,
      templateId,
      template,
      leads,
      status: 'draft',
      settings: {
        timezone: 'UTC',
        sendingHours: { from: '09:00', to: '17:00' },
        abTesting: false,
        delayBetweenEmails: 200,
        ...settings
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    campaigns.push(campaign);
    
    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
    
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const campaignIndex = campaigns.findIndex(c => c.id === id);
    
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Update campaign
    campaigns[campaignIndex] = {
      ...campaigns[campaignIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaigns[campaignIndex]
    });
    
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const campaignIndex = campaigns.findIndex(c => c.id === id);
    
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    const deletedCampaign = campaigns.splice(campaignIndex, 1)[0];
    
    res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully',
      data: deletedCampaign
    });
    
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/campaigns/:id/send - Send campaign
router.post('/:id/send', (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    if (campaign.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Campaign has already been sent'
      });
    }
    
    // Update campaign status to sending
    campaign.status = 'sending';
    campaign.updatedAt = new Date().toISOString();
    
    res.status(200).json({
      success: true,
      message: 'Campaign status updated to sending',
      data: campaign
    });
    
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/campaigns/:id/analytics - Get campaign analytics
router.get('/:id/analytics', (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Return analytics if available
    const analytics = campaign.analytics || {
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
    
    res.status(200).json({
      success: true,
      message: 'Campaign analytics retrieved successfully',
      data: analytics
    });
    
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
