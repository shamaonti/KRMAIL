const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

/**
 * EMAIL SCHEDULER SERVICE
 * Sends scheduled campaigns using ALL sender accounts (batch processing)
 * ✅ Global unsubscribe safe (once unsubscribed = never email again)
 * ✅ Respects daily_limit per email account
 * ✅ Distributes emails evenly across accounts based on max_level
 * ✅ Continues sending until stack is empty
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
      lastRunTime: null,
    };
  }

  start() {
    if (this.cronJob) return;
    console.log("📅 Email Scheduler started");

    this.cronJob = cron.schedule("* * * * *", async () => {
      if (!this.isPaused) {
        await this.checkAndSendScheduledCampaigns();
      }
    });
  }

  pause() { 
    this.isPaused = true;
    console.log("⏸️ Scheduler paused");
  }
  
  resume() { 
    this.isPaused = false;
    console.log("▶️ Scheduler resumed");
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("⏹️ Scheduler stopped");
    }
  }

  async triggerManually() {
    console.log("🔧 Manual trigger initiated");
    await this.checkAndSendScheduledCampaigns();
  }

  normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  // {Name} & {{name}} support
  mergePlaceholders(content, lead) {
    let out = content;

    const name = lead.name || "";
    const email = lead.email || "";
    const payload = lead.payload
      ? (typeof lead.payload === "string" ? JSON.parse(lead.payload) : lead.payload)
      : {};

    const allFields = { name, email, Name: name, Email: email, ...payload };

    for (const [key, value] of Object.entries(allFields)) {
      const safe = String(value || "");
      out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
      out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"), safe);
    }

    return out;
  }

  async checkAndSendScheduledCampaigns() {
    if (this.isProcessing) {
      console.log("⏳ Already processing campaigns, skipping...");
      return;
    }

    this.isProcessing = true;
    const conn = await db.getConnection();

    try {
      const [campaigns] = await conn.query(
        `SELECT * FROM email_campaigns
         WHERE status = 'scheduled'
           AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC`
      );

      if (!campaigns.length) return;

      console.log(`\n🚀 ${campaigns.length} campaign(s) due — processing...`);

      for (const campaign of campaigns) {
        await this.sendCampaign(conn, campaign);
        this.stats.totalProcessed++;
      }

      this.stats.lastRunTime = new Date();
    } catch (err) {
      console.error("❌ Scheduler error:", err);
      this.stats.totalFailed++;
    } finally {
      conn.release();
      this.isProcessing = false;
    }
  }

  /**
   * Get available sending capacity for each email account today
   */
  async getEmailAccountCapacity(conn, userId) {
    const [accounts] = await conn.query(
      `SELECT
         id,
         from_name,
         from_email AS email,
         smtp_username AS smtp_user,
         smtp_password AS app_password,
         smtp_host,
         smtp_port,
         smtp_security,
         daily_limit
       FROM user_email_accounts
       WHERE user_id = ?`,
      [userId]
    );

    if (!accounts.length) return [];

    // Get today's sent count for each account
    const accountsWithCapacity = [];
    
    for (const account of accounts) {
      const [sentToday] = await conn.query(
        `SELECT COUNT(*) as sent_count
         FROM campaign_data
         WHERE sent_from_email = ?
           AND DATE(sent_at) = CURDATE()
           AND status = 'sent'`,
        [account.email]
      );

      const sentCount = sentToday[0]?.sent_count || 0;
      const remaining = Math.max(0, account.daily_limit - sentCount);

      accountsWithCapacity.push({
        ...account,
        sentToday: sentCount,
        remainingToday: remaining
      });
    }

    return accountsWithCapacity;
  }

  /**
   * Distribute leads across email accounts based on their capacity
   */
  distributeLeadsToAccounts(leads, emailAccounts, maxLevel) {
    const distribution = [];
    
    // Calculate total available capacity
    const totalCapacity = emailAccounts.reduce((sum, acc) => sum + acc.remainingToday, 0);
    
    if (totalCapacity === 0) {
      console.log("⚠️ No sending capacity available today");
      return [];
    }

    // Calculate batch size (min of max_level per account OR total leads)
    const batchSize = Math.min(
      emailAccounts.length * maxLevel,
      leads.length,
      totalCapacity
    );

    console.log(`📊 Batch size: ${batchSize} (${emailAccounts.length} accounts × ${maxLevel} max_level)`);

    let leadIndex = 0;
    let accountIndex = 0;

    // Distribute leads in round-robin fashion
    while (leadIndex < batchSize && leadIndex < leads.length) {
      const account = emailAccounts[accountIndex];
      
      // Skip account if it has no remaining capacity
      if (account.remainingToday <= 0) {
        accountIndex = (accountIndex + 1) % emailAccounts.length;
        
        // Check if all accounts are exhausted
        if (emailAccounts.every(acc => acc.remainingToday <= 0)) {
          console.log("⚠️ All accounts reached daily limit");
          break;
        }
        continue;
      }

      // Calculate how many emails this account can send in this batch
      const accountBatchLimit = Math.min(
        maxLevel,
        account.remainingToday,
        batchSize - leadIndex
      );

      // Assign leads to this account
      for (let i = 0; i < accountBatchLimit && leadIndex < batchSize && leadIndex < leads.length; i++) {
        distribution.push({
          lead: leads[leadIndex],
          account: account
        });
        
        leadIndex++;
        account.remainingToday--; // Decrease remaining capacity
      }

      accountIndex = (accountIndex + 1) % emailAccounts.length;
    }

    return distribution;
  }

  async sendCampaign(conn, campaign) {
    console.log(`\n📧 Campaign: "${campaign.name}" (id: ${campaign.id})`);

    // Get campaign settings
    const maxLevel = campaign.max_level || 100;
    const delayMs = campaign.delay_ms || 200;

    console.log(`⚙️ Settings: max_level=${maxLevel}, delay_ms=${delayMs}ms`);

    // 🔐 STEP 1: Mark unsubscribed users in campaign_data
    await conn.query(
      `UPDATE campaign_data cd
      JOIN unsubscribes u
        ON LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))
        AND u.user_id = ?
      SET cd.status = 'unsubscribed'
      WHERE cd.campaign_id = ?
        AND cd.status = 'pending'`,
      [campaign.user_id, campaign.id]
    );

    let totalSent = 0;
    let totalFailed = 0;
    let batchNumber = 0;

    try {
      // Get template content once (outside the loop)
      const [templates] = await conn.query(
        `SELECT content FROM email_templates WHERE id = ?`,
        [campaign.template_id]
      );
      const templateContent = templates?.[0]?.content || "";

      if (!templateContent) {
        console.error("❌ No template content found");
        await conn.query(
          `UPDATE email_campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?`,
          [campaign.id]
        );
        return;
      }

      // 🔄 CONTINUOUS LOOP UNTIL ALL EMAILS SENT (STACK EMPTY)
      while (true) {
        batchNumber++;
        console.log(`\n🔄 === BATCH ${batchNumber} ===`);

        /**
         * 🔐 GLOBAL UNSUBSCRIBE RULE
         * If email exists in unsubscribes table for this user → DO NOT SEND
         */
        const [leads] = await conn.query(
          `SELECT cd.email, cd.name, cd.payload, cd.status
           FROM campaign_data cd
           LEFT JOIN unsubscribes u
             ON LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))
            AND u.user_id = ?
           WHERE cd.campaign_id = ?
             AND cd.status = 'pending'
             AND u.id IS NULL`,
          [campaign.user_id, campaign.id]
        );

        if (!leads.length) {
          console.log("✅ Stack empty - All emails processed!");
          break; // Exit the loop - no more leads to process
        }

        console.log(`📬 Pending leads in stack: ${leads.length}`);

        // Get email accounts with their remaining daily capacity
        const emailAccounts = await this.getEmailAccountCapacity(conn, campaign.user_id);

        if (!emailAccounts.length) {
          console.error("❌ No email accounts for user:", campaign.user_id);
          break;
        }

        // Check if any account has capacity
        const totalCapacity = emailAccounts.reduce((sum, acc) => sum + acc.remainingToday, 0);
        
        if (totalCapacity === 0) {
          console.log("⚠️ All accounts reached daily limit - stopping");
          break;
        }

        // Log account capacities
        console.log("\n📮 Email Account Capacities:");
        emailAccounts.forEach(acc => {
          console.log(`   ${acc.email}: ${acc.sentToday}/${acc.daily_limit} sent today, ${acc.remainingToday} remaining`);
        });

        // Distribute leads across accounts for this batch
        const distribution = this.distributeLeadsToAccounts(leads, emailAccounts, maxLevel);

        if (!distribution.length) {
          console.log("⚠️ No emails can be sent in this batch");
          break;
        }

        console.log(`🎯 Sending batch ${batchNumber} (${distribution.length} emails)...`);

        let batchSent = 0;
        let batchFailed = 0;

        // Send emails according to distribution
        for (const item of distribution) {
          const { lead, account } = item;
          const leadEmailNorm = this.normalizeEmail(lead.email);

          const transporter = createTransporter(account);

          try {
            let emailContent = this.mergePlaceholders(templateContent, lead);

            // Add tracking pixel
            const trackingPixel = `<img src="${process.env.APP_URL}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(lead.email)}&t=${Date.now()}" width="1" height="1" style="display:none" />`;
            emailContent += trackingPixel;

            // Add unsubscribe link
            const token = sign({
              email: leadEmailNorm,
              userId: campaign.user_id,
              campaignId: campaign.id,
              scope: "all",
              exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
            });

            emailContent += `
              <hr/>
              <p style="font-size:12px;color:#666">
                Don't want these emails?
                <a href="${process.env.APP_URL}/unsubscribe?token=${token}">Unsubscribe</a>
              </p>`;

            // Send email
            await transporter.sendMail({
              from: `"${account.from_name || "Campaign"}" <${account.email}>`,
              to: lead.email,
              subject: campaign.subject,
              html: emailContent,
            });

            // Update campaign_data
            await conn.query(
              `UPDATE campaign_data
               SET status = 'sent', sent_at = NOW(), sent_from_email = ?
               WHERE campaign_id = ? AND LOWER(TRIM(email)) = ?`,
              [account.email, campaign.id, leadEmailNorm]
            );

            batchSent++;
            totalSent++;
            console.log(`✅ [${batchSent}/${distribution.length}] ${lead.email} ← ${account.email}`);
            
            // Delay between emails
            await this.delay(delayMs);

          } catch (err) {
            batchFailed++;
            totalFailed++;
            
            await conn.query(
              `UPDATE campaign_data
               SET status = 'failed', error_message = ?, sent_from_email = ?
               WHERE campaign_id = ? AND LOWER(TRIM(email)) = ?`,
              [String(err?.message || err), account.email, campaign.id, leadEmailNorm]
            );
            
            console.error(`❌ ${lead.email}:`, err?.message || err);
          }
        }

        console.log(`\n🎉 Batch ${batchNumber} Complete → Sent: ${batchSent}, Failed: ${batchFailed}`);
        
        // Update campaign counts after each batch
        await conn.query(
          `UPDATE email_campaigns
           SET sent_count = ?,
               failed_count = ?,
               status = 'sending',
               updated_at = NOW()
           WHERE id = ?`,
          [totalSent, totalFailed, campaign.id]
        );

        // Check if more leads exist
        const [remaining] = await conn.query(
          `SELECT COUNT(*) as count
           FROM campaign_data
           WHERE campaign_id = ? AND status = 'pending'`,
          [campaign.id]
        );

        if (remaining[0].count > 0) {
          console.log(`⏳ ${remaining[0].count} leads remaining - waiting ${delayMs}ms before next batch...`);
          await this.delay(delayMs); // Delay before starting next batch
          // Loop continues to next batch...
        } else {
          console.log("✅ Stack empty - All emails sent!");
          break; // Exit the loop
        }
      }

      // Final update - mark campaign as complete
      await conn.query(
        `UPDATE email_campaigns
         SET status = 'sent',
             sent_count = ?,
             failed_count = ?,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [totalSent, totalFailed, campaign.id]
      );

      console.log(`\n🏁 CAMPAIGN COMPLETE!`);
      console.log(`📊 Total Batches: ${batchNumber}`);
      console.log(`📧 Total Sent: ${totalSent}`);
      console.log(`❌ Total Failed: ${totalFailed}`);

      // Update stats
      this.stats.totalSent += totalSent;
      this.stats.totalFailed += totalFailed;

    } catch (err) {
      console.error("❌ sendCampaign crash:", err);
      await conn.query(
        `UPDATE email_campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?`,
        [campaign.id]
      );
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      isRunning: this.cronJob !== null
    };
  }
}

module.exports = new EmailScheduler();

