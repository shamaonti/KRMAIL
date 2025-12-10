const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const databaseService = require('../services/databaseService');

// Middleware to validate email data
const validateEmailData = (req, res, next) => {
  const { to, subject, htmlBody, textBody } = req.body;
  
  if (!to) {
    return res.status(400).json({ error: 'Recipient email (to) is required' });
  }
  
  if (!subject) {
    return res.status(400).json({ error: 'Email subject is required' });
  }
  
  if (!htmlBody && !textBody) {
    return res.status(400).json({ error: 'Email body (htmlBody or textBody) is required' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }
  
  next();
};

// GET /api/email/track/:logId - Track email open with invisible pixel
router.get('/track/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const ip = req.query.ip || req.ip || req.connection.remoteAddress;
    const ua = req.query.ua || req.get('User-Agent');
    
    // Log the email open event
    console.log(`📧 Email opened - Log ID: ${logId}, IP: ${ip}, User Agent: ${ua}`);
    
    // Update database to mark email as opened
    await databaseService.trackEmailOpen(logId, ip, ua);
    
    // Return a 1x1 transparent GIF pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.end(pixel);
    
  } catch (error) {
    console.error('Email tracking error:', error);
    // Still return the pixel even if tracking fails
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length
    });
    res.end(pixel);
  }
});

// GET /api/email/track/click/:logId - Track email link clicks
router.get('/track/click/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { url } = req.query;
    const ip = req.query.ip || req.ip || req.connection.remoteAddress;
    const ua = req.query.ua || req.get('User-Agent');
    
    // Log the email click event
    console.log(`🔗 Email clicked - Log ID: ${logId}, URL: ${url}, IP: ${ip}, User Agent: ${ua}`);
    
    // Update database to mark email as clicked
    await databaseService.trackEmailClick(logId, url, ip, ua);
    
    // Redirect to the original URL
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.status(400).json({ error: 'No URL provided for click tracking' });
    }
    
  } catch (error) {
    console.error('Email click tracking error:', error);
    res.status(500).json({ error: 'Click tracking failed' });
  }
});

// POST /api/email/send - Send single email
router.post('/send', validateEmailData, async (req, res) => {
  try {
    const { to, subject, htmlBody, textBody, from, replyTo, attachments, logId } = req.body;
    
    // Add tracking pixel to HTML if logId is provided
    let finalHtmlBody = htmlBody;
    if (logId && htmlBody) {
      const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:3001'}/api/email/track/${logId}" width="1" height="1" style="display:none;" alt="" />`;
      finalHtmlBody = htmlBody + trackingPixel;
    }
    
    const result = await emailService.sendEmail({
      to,
      subject,
      htmlBody: finalHtmlBody,
      textBody,
      from,
      replyTo,
      attachments
    });
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error,
        data: result
      });
    }
    
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/email/bulk - Send multiple emails
router.post('/bulk', async (req, res) => {
  try {
    const { emails, options = {} } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ 
        error: 'Emails array is required and must not be empty' 
      });
    }
    
    // Validate each email
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      if (!email.to || !email.subject || (!email.htmlBody && !email.textBody)) {
        return res.status(400).json({ 
          error: `Email at index ${i} is missing required fields: to, subject, and htmlBody or textBody` 
        });
      }
    }
    
    const result = await emailService.sendBulkEmails(emails, options);
    
    res.status(200).json({
      success: true,
      message: 'Bulk email operation completed',
      data: result
    });
    
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/email/test - Send test email
router.post('/test', async (req, res) => {
  try {
    const { to, subject } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient email (to) is required' });
    }
    
    const result = await emailService.testEmail(to, subject);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error,
        data: result
      });
    }
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/email/verify - Verify SMTP connection
router.get('/verify', async (req, res) => {
  try {
    const { senderEmail } = req.query;
    
    const result = await emailService.verifyConnection(senderEmail);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'SMTP connection verified successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'SMTP connection failed',
        error: result.error,
        data: result
      });
    }
    
  } catch (error) {
    console.error('SMTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/email/config - Get SMTP configuration (for debugging)
router.get('/config', async (req, res) => {
  try {
    const config = emailService.getSmtpConfig();
    
    res.status(200).json({
      success: true,
      message: 'SMTP configuration retrieved',
      data: {
        ...config,
        // Don't expose sensitive data in production
        senderEmails: process.env.NODE_ENV === 'development' ? config.senderEmails : config.senderEmails.map(() => '***')
      }
    });
    
  } catch (error) {
    console.error('Config retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/email/campaign - Send campaign emails (compatible with frontend)
router.post('/campaign', async (req, res) => {
  try {
    const { 
      leads, 
      subject, 
      template, 
      config, 
      campaignId, 
      userId,
      followupSettings 
    } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ 
        error: 'Leads array is required and must not be empty' 
      });
    }
    
    if (!subject) {
      return res.status(400).json({ error: 'Email subject is required' });
    }
    
    if (!template) {
      return res.status(400).json({ error: 'Email template is required' });
    }
    
    // Prepare emails from leads and template with tracking
    const emails = leads.map((lead, index) => {
      // Replace template variables
      let htmlBody = template;
      const variables = {
        'Name': `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        'FirstName': lead.firstName || '',
        'LastName': lead.lastName || '',
        'Company': lead.company || '',
        'Email': lead.email,
        ...lead.customFields
      };
      
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'gi');
        htmlBody = htmlBody.replace(regex, value || '');
      });
      
      // Generate unique log ID for tracking
      const logId = `${campaignId || 'campaign'}_${Date.now()}_${index}`;
      
      // Add tracking pixel
      const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:3001'}/api/email/track/${logId}" width="1" height="1" style="display:none;" alt="" />`;
      htmlBody = htmlBody + trackingPixel;
      
      return {
        to: lead.email,
        subject: subject,
        htmlBody: htmlBody,
        logId: logId,
        lead: lead,
        campaignId: campaignId,
        userId: userId
      };
    });
    
    const result = await emailService.sendBulkEmails(emails, {
      delayBetweenEmails: config?.delayBetweenEmails || 200
    });
    
    // Schedule follow-up emails if configured
    if (followupSettings && followupSettings.enabled) {
      await scheduleFollowupEmails(emails, followupSettings, result.results);
    }
    
    res.status(200).json({
      success: true,
      message: 'Campaign emails sent successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Campaign email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Helper function to schedule follow-up emails
async function scheduleFollowupEmails(emails, followupSettings, emailResults) {
  try {
    const { template, subject, delayHours, condition } = followupSettings;
    const followupService = require('../services/followupService');
    
    // Schedule follow-ups for emails that were successfully sent
    const successfulEmails = emailResults.filter(result => result.success);
    
    for (const emailResult of successfulEmails) {
      const originalEmail = emails.find(e => e.to === emailResult.email);
      if (!originalEmail) continue;
      
      // Schedule follow-up using the follow-up service
      const followupData = {
        campaignId: originalEmail.campaignId,
        contactId: 1, // TODO: Get actual contact ID
        emailLogId: originalEmail.logId,
        userId: originalEmail.userId,
        email: originalEmail.to,
        followupTemplateId: followupSettings.templateId,
        followupSubject: subject,
        original_subject: originalEmail.subject,
        template_content: template?.content,
        delayHours: delayHours,
        condition: condition
      };
      
      const result = await followupService.scheduleFollowup(followupData);
      if (result.success) {
        console.log(`📅 Scheduled follow-up email for ${originalEmail.to} at ${result.scheduledAt}`);
      } else {
        console.error(`❌ Failed to schedule follow-up for ${originalEmail.to}:`, result.error);
      }
    }
    
  } catch (error) {
    console.error('Error scheduling follow-up emails:', error);
  }
}

module.exports = router;
