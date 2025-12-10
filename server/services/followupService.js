const emailService = require('./emailService');
const databaseService = require('./databaseService');

class FollowupService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    // In-memory storage for testing when database is not available
    this.inMemoryFollowups = [];
  }

  // Start the follow-up email processor
  startProcessor() {
    if (this.processingInterval) {
      return; // Already running
    }

    // Check for pending follow-ups every 1 minute for testing (was 5 minutes)
    this.processingInterval = setInterval(async () => {
      await this.processFollowupQueue();
    }, 1 * 60 * 1000);

    console.log('🔄 Follow-up email processor started (checking every 1 minute)');
  }

  // Stop the follow-up email processor
  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Follow-up email processor stopped');
    }
  }

  // Process the follow-up email queue
  async processFollowupQueue() {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      // TODO: Query database for pending follow-ups that are due
      const pendingFollowups = await this.getPendingFollowups();
      
      for (const followup of pendingFollowups) {
        await this.processFollowup(followup);
      }

    } catch (error) {
      console.error('Error processing follow-up queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get pending follow-ups from database or in-memory storage
  async getPendingFollowups() {
    try {
      // Try to get from database first
      if (databaseService.isConnected) {
        return await databaseService.getPendingFollowups();
      }
    } catch (error) {
      console.log('📝 Database not available, using in-memory follow-up storage');
    }
    
    // Fallback to in-memory storage for testing
    return this.getInMemoryPendingFollowups();
  }

  // Process a single follow-up email
  async processFollowup(followup) {
    try {
      console.log(`📧 Processing follow-up for ${followup.email}`);

      // Check if original email was opened (if condition requires it)
      if (followup.condition === 'not_opened') {
        let wasOpened = false;
        try {
          if (databaseService.isConnected) {
            wasOpened = await databaseService.checkEmailOpened(followup.email_log_id);
          } else {
            wasOpened = await this.checkEmailOpenedInMemory(followup.email_log_id);
          }
        } catch (error) {
          wasOpened = await this.checkEmailOpenedInMemory(followup.email_log_id);
        }
        
        if (wasOpened) {
          console.log(`📧 Skipping follow-up for ${followup.email} - original email was opened`);
          await this.updateFollowupStatus(followup.id, 'cancelled', 'Original email was opened');
          return;
        }
      }

      // Check if original email was clicked (if condition requires it)
      if (followup.condition === 'not_clicked') {
        let wasClicked = false;
        try {
          if (databaseService.isConnected) {
            wasClicked = await databaseService.checkEmailClicked(followup.email_log_id);
          } else {
            wasClicked = await this.checkEmailClickedInMemory(followup.email_log_id);
          }
        } catch (error) {
          wasClicked = await this.checkEmailClickedInMemory(followup.email_log_id);
        }
        
        if (wasClicked) {
          console.log(`📧 Skipping follow-up for ${followup.email} - original email was clicked`);
          await this.updateFollowupStatus(followup.id, 'cancelled', 'Original email was clicked');
          return;
        }
      }

      // Prepare follow-up email content
      let followupContent = followup.template_content;
      if (!followupContent) {
        // Create a simple test follow-up template
        const minutesAgo = Math.floor((Date.now() - new Date(followup.createdAt).getTime()) / (1000 * 60));
        followupContent = `
          <h2>Follow-up Email</h2>
          <p>Hi there,</p>
          <p>This is a follow-up email sent ${minutesAgo} minutes after the original email was successfully delivered.</p>
          <p><strong>REPLY SENT ${minutesAgo} MINUTES AFTER SUCCESSFULLY</strong></p>
          <p>Thank you for your interest!</p>
          <p>Best regards,<br>The MailSkrap Team</p>
        `;
      }

      // Send the follow-up email
      const result = await emailService.sendEmail({
        to: followup.email,
        subject: followup.followup_subject || 'Follow-up: ' + (followup.original_subject || 'Your previous email'),
        htmlBody: followupContent,
        from: null // Will use default sender
      });

      if (result.success) {
        await this.updateFollowupStatus(followup.id, 'sent');
        console.log(`✅ Follow-up sent successfully to ${followup.email}`);
      } else {
        await this.updateFollowupStatus(followup.id, 'failed', result.error);
        console.error(`❌ Failed to send follow-up to ${followup.email}:`, result.error);
      }

    } catch (error) {
      console.error(`❌ Error processing follow-up for ${followup.email}:`, error);
      await this.updateFollowupStatus(followup.id, 'failed', error.message);
    }
  }

  // Check if an email was opened
  async checkEmailOpened(emailLogId) {
    return await databaseService.checkEmailOpened(emailLogId);
  }

  // Check if an email was clicked
  async checkEmailClicked(emailLogId) {
    return await databaseService.checkEmailClicked(emailLogId);
  }

  // Update follow-up status in database or memory
  async updateFollowupStatus(followupId, status, errorMessage = null) {
    try {
      if (databaseService.isConnected) {
        return await databaseService.updateFollowupStatus(followupId, status, errorMessage);
      }
    } catch (error) {
      console.log('📝 Database not available, updating in-memory status');
    }
    
    // Fallback to in-memory update
    return this.updateInMemoryFollowupStatus(followupId, status, errorMessage);
  }

  // Schedule a follow-up email
  async scheduleFollowup(followupData) {
    try {
      if (databaseService.isConnected) {
        return await databaseService.scheduleFollowup(followupData);
      }
    } catch (error) {
      console.log('📝 Database not available, scheduling in-memory follow-up');
    }
    
    // Fallback to in-memory scheduling
    return this.scheduleInMemoryFollowup(followupData);
  }

  // Get follow-up statistics for a campaign
  async getFollowupStats(campaignId) {
    try {
      if (databaseService.isConnected) {
        return await databaseService.getFollowupStats(campaignId);
      }
    } catch (error) {
      console.log('📝 Database not available, using in-memory stats');
    }
    
    // Fallback to in-memory stats
    const campaignFollowups = this.inMemoryFollowups.filter(f => f.campaignId === campaignId);
    return {
      totalScheduled: campaignFollowups.length,
      totalSent: campaignFollowups.filter(f => f.status === 'sent').length,
      totalCancelled: campaignFollowups.filter(f => f.status === 'cancelled').length,
      totalFailed: campaignFollowups.filter(f => f.status === 'failed').length
    };
  }

  // In-memory follow-up management methods for testing
  getInMemoryPendingFollowups() {
    const now = new Date();
    return this.inMemoryFollowups.filter(followup => 
      followup.status === 'pending' && 
      new Date(followup.scheduledAt) <= now
    );
  }

  // Schedule follow-up in memory
  scheduleInMemoryFollowup(followupData) {
    const followup = {
      id: `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...followupData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      scheduledAt: followupData.scheduledAt || new Date(Date.now() + (followupData.delayHours * 60 * 60 * 1000)).toISOString()
    };
    
    this.inMemoryFollowups.push(followup);
    console.log(`📅 Scheduled in-memory follow-up for ${followup.email} at ${followup.scheduledAt}`);
    
    return {
      success: true,
      id: followup.id,
      scheduledAt: followup.scheduledAt
    };
  }

  // Update follow-up status in memory
  updateInMemoryFollowupStatus(followupId, status, errorMessage = null) {
    const followup = this.inMemoryFollowups.find(f => f.id === followupId);
    if (followup) {
      followup.status = status;
      followup.errorMessage = errorMessage;
      if (status === 'sent') {
        followup.sentAt = new Date().toISOString();
      }
      console.log(`📝 Updated in-memory follow-up ${followupId} status to ${status}`);
      return true;
    }
    return false;
  }

  // Check if email was opened (simulate for testing)
  async checkEmailOpenedInMemory(emailLogId) {
    // For testing, simulate that emails are not opened initially
    // In a real implementation, this would check the database
    return false;
  }

  // Check if email was clicked (simulate for testing)
  async checkEmailClickedInMemory(emailLogId) {
    // For testing, simulate that emails are not clicked initially
    // In a real implementation, this would check the database
    return false;
  }
}

module.exports = new FollowupService();
