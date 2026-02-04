const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const db = require("../db");
const { getLatestEmailAccount } = require("../helpers/emailAccount");
const { createTransporter } = require("../helpers/mailer");

/**
 * EMAIL SCHEDULER SERVICE
 * Checks every minute for scheduled campaigns that need to be sent
 * Runs: * * * * * (every minute)
 */

class EmailScheduler {
  constructor() {
    this.isProcessing = false;
    this.isPaused = false;
    this.cronJob = null;
    this.stats = {
      totalProcessed: 0,
      totalSent: 0,
      totalFailed: 0,
      lastRunTime: null
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.cronJob) {
      console.log("⚠️ Email Scheduler is already running");
      return;
    }

    console.log("📅 Email Scheduler starting...");
    
    // Run every minute: * * * * *
    this.cronJob = cron.schedule("* * * * *", async () => {
      if (!this.isPaused) {
        await this.checkAndSendScheduledCampaigns();
      } else {
        console.log("⏸️ Scheduler is paused, skipping check");
      }
    });

    console.log("✅ Email Scheduler started successfully");
    console.log("⏰ Checking for scheduled campaigns every minute");
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("⏹️ Email Scheduler stopped");
    }
  }

  /**
   * Pause the scheduler
   */
  pause() {
    this.isPaused = true;
    console.log("⏸️ Email Scheduler paused");
  }

  /**
   * Resume the scheduler
   */
  resume() {
    this.isPaused = false;
    console.log("▶️ Email Scheduler resumed");
  }

  /**
   * Main function: Check and send scheduled campaigns
   */
  async checkAndSendScheduledCampaigns() {
    // Prevent concurrent execution
    if (this.isProcessing) {
      console.log("⚠️ Already processing campaigns, skipping this cycle");
      return;
    }

    this.isProcessing = true;
    const conn = await db.getConnection();

    try {
      const now = new Date();
      console.log(`\n🔍 Checking for scheduled campaigns at ${now.toLocaleString()}`);

      // Find campaigns that are scheduled and should be sent now
      const [scheduledCampaigns] = await conn.query(
        `SELECT * FROM email_campaigns 
         WHERE status = 'scheduled' 
         AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC`,
        []
      );

      if (scheduledCampaigns.length === 0) {
        console.log("📭 No scheduled campaigns to send");
        return;
      }

      console.log(`📬 Found ${scheduledCampaigns.length} campaign(s) to send`);

      // Process each campaign
      for (const campaign of scheduledCampaigns) {
        await this.sendCampaign(conn, campaign);
        this.stats.totalProcessed++;
      }

      this.stats.lastRunTime = new Date();

    } catch (error) {
      console.error("❌ Scheduler error:", error);
    } finally {
      conn.release();
      this.isProcessing = false;
    }
  }

  /**
   * Send a single campaign
   */
  async sendCampaign(conn, campaign) {
    try {
      console.log(`\n📧 Processing campaign: ${campaign.name} (ID: ${campaign.id})`);

      // 1. Update status to 'sending'
      await conn.query(
        `UPDATE email_campaigns SET status = 'sending', updated_at = NOW() WHERE id = ?`,
        [campaign.id]
      );

      // 2. Get all leads for this campaign
      const [leads] = await conn.query(
        `SELECT email, name, payload FROM campaign_data WHERE campaign_id = ?`,
        [campaign.id]
      );

      if (leads.length === 0) {
        console.log(`⚠️ No leads found for campaign ${campaign.id}`);
        await conn.query(
          `UPDATE email_campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?`,
          [campaign.id]
        );
        return;
      }

      console.log(`👥 Found ${leads.length} leads`);

      // 3. Get email account
      const emailAccount = await getLatestEmailAccount(conn, campaign.user_id);
      console.log(`📮 Using email account: ${emailAccount.email}`);

      // 4. Create transporter
      const transporter = createTransporter(emailAccount);

      // 5. Send emails to all leads
      let sentCount = 0;
      let failedCount = 0;

      for (const lead of leads) {
        try {
          // Fetch template using template_id
          const [templates] = await conn.query(
            `SELECT content FROM email_templates WHERE id = ?`,
            [campaign.template_id]
          );

          if (!templates.length) {
            throw new Error("Email template not found");
          }

          const templateContent = templates[0].content;

          // Replace placeholders
          let emailContent = templateContent;

          if (lead.name) {
            emailContent = emailContent.replace(/\{\{name\}\}/gi, lead.name);
          }
          emailContent = emailContent.replace(/\{\{email\}\}/gi, lead.email);

          // 🔥 CRITICAL FIX: Add tracking pixel BEFORE closing body tag (if exists)
          // This ensures better email client compatibility
          const trackingPixel = `<img src="${process.env.APP_URL}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(lead.email)}&t=${Date.now()}" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;border:0;margin:0;padding:0;" alt="" border="0" />`;

          // Insert tracking pixel before </body> if it exists, otherwise append
          if (emailContent.includes('</body>')) {
            emailContent = emailContent.replace('</body>', `${trackingPixel}</body>`);
          } else {
            emailContent += trackingPixel;
          }

          console.log(`🔍 Tracking URL: ${process.env.APP_URL}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(lead.email)}`);

          // Send email
          await transporter.sendMail({
            from: `"${emailAccount.from_name || 'Campaign'}" <${emailAccount.email}>`,
            to: lead.email,
            subject: campaign.subject,
            html: emailContent
          });

          sentCount++;
          this.stats.totalSent++;
          console.log(`✅ Sent to ${lead.email} (${sentCount}/${leads.length})`);

          // Update individual lead status
          await conn.query(
            `UPDATE campaign_data SET status = 'sent', sent_at = NOW() WHERE campaign_id = ? AND email = ?`,
            [campaign.id, lead.email]
          );

          // Small delay to avoid rate limiting
          await this.delay(200);

        } catch (sendError) {
          failedCount++;
          this.stats.totalFailed++;
          console.error(`❌ Failed to send to ${lead.email}:`, sendError.message);
          
          // Update individual lead status
          await conn.query(
            `UPDATE campaign_data SET status = 'failed', error_message = ? WHERE campaign_id = ? AND email = ?`,
            [sendError.message, campaign.id, lead.email]
          );
        }
      }

      // 6. Update campaign final status
      await conn.query(
        `UPDATE email_campaigns 
         SET status = 'sent', 
             sent_count = ?, 
             failed_count = ?,
             completed_at = NOW(),
             updated_at = NOW() 
         WHERE id = ?`,
        [sentCount, failedCount, campaign.id]
      );

      console.log(`✅ Campaign completed: ${sentCount} sent, ${failedCount} failed`);

      // 7. Check if follow-up is enabled
      if (campaign.has_followup) {
        await this.scheduleFollowup(conn, campaign);
      }

    } catch (error) {
      console.error(`❌ Error sending campaign ${campaign.id}:`, error);
      
      // Update campaign status to failed
      await conn.query(
        `UPDATE email_campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?`,
        [campaign.id]
      );
    }
  }

  /**
   * Schedule follow-up campaign
   */
  async scheduleFollowup(conn, parentCampaign) {
    try {
      console.log(`📨 Scheduling follow-up for campaign ${parentCampaign.id}`);

      const followupTime = new Date();
      followupTime.setHours(followupTime.getHours() + (parentCampaign.followup_delay_hours || 24));

      // Get leads that meet the follow-up condition
      let conditionQuery = '';
      if (parentCampaign.followup_condition === 'not_opened') {
        conditionQuery = `AND (opened_at IS NULL OR opened_at = '0000-00-00 00:00:00')`;
      } else if (parentCampaign.followup_condition === 'not_clicked') {
        conditionQuery = `AND (clicked_at IS NULL OR clicked_at = '0000-00-00 00:00:00')`;
      }

      const [followupLeads] = await conn.query(
        `SELECT email, name, payload 
         FROM campaign_data 
         WHERE campaign_id = ? AND status = 'sent' ${conditionQuery}`,
        [parentCampaign.id]
      );

      if (followupLeads.length === 0) {
        console.log(`⚠️ No leads qualify for follow-up`);
        return;
      }

      // Create follow-up campaign
      const [result] = await conn.query(
        `INSERT INTO email_campaigns
         (user_id, name, subject, content, template_id,
          status, scheduled_at, total_recipients, parent_campaign_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parentCampaign.user_id,
          `${parentCampaign.name} - Follow-up`,
          parentCampaign.followup_subject,
          parentCampaign.followup_content || parentCampaign.content,
          parentCampaign.followup_template_id,
          'scheduled',
          followupTime,
          followupLeads.length,
          parentCampaign.id
        ]
      );

      const followupCampaignId = result.insertId;

      // Insert leads for follow-up
      const values = followupLeads.map(l => [
        followupCampaignId,
        l.email,
        l.name || null,
        l.payload
      ]);

      await conn.query(
        `INSERT IGNORE INTO campaign_data
         (campaign_id, email, name, payload)
         VALUES ?`,
        [values]
      );

      console.log(`✅ Follow-up campaign scheduled for ${followupTime.toLocaleString()} with ${followupLeads.length} recipients`);

    } catch (error) {
      console.error(`❌ Error scheduling follow-up:`, error);
    }
  }

  /**
   * Utility: Add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual trigger (for testing)
   */
  async triggerManually() {
    console.log("🔧 Manually triggering scheduler check...");
    await this.checkAndSendScheduledCampaigns();
  }
}

// Export singleton instance
const emailScheduler = new EmailScheduler();

module.exports = emailScheduler;