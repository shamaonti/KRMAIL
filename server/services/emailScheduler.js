const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");

/**
 * EMAIL SCHEDULER SERVICE
 * Sends scheduled campaigns using ALL sender accounts (round-robin)
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

  start() {
    if (this.cronJob) return;

    console.log("📅 Email Scheduler started");

    this.cronJob = cron.schedule("* * * * *", async () => {
      if (!this.isPaused) {
        await this.checkAndSendScheduledCampaigns();
      }
    });
  }

  async checkAndSendScheduledCampaigns() {
    if (this.isProcessing) return;

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

      for (const campaign of campaigns) {
        await this.sendCampaign(conn, campaign);
        this.stats.totalProcessed++;
      }

      this.stats.lastRunTime = new Date();

    } catch (err) {
      console.error("❌ Scheduler error:", err);
    } finally {
      conn.release();
      this.isProcessing = false;
    }
  }

  async sendCampaign(conn, campaign) {
    console.log(`\n📧 Campaign: ${campaign.name} (${campaign.id})`);

    await conn.query(
      `UPDATE email_campaigns SET status = 'sending' WHERE id = ?`,
      [campaign.id]
    );

    const [leads] = await conn.query(
      `SELECT email, name, payload FROM campaign_data WHERE campaign_id = ?`,
      [campaign.id]
    );

    if (!leads.length) {
      await conn.query(
        `UPDATE email_campaigns SET status = 'failed' WHERE id = ?`,
        [campaign.id]
      );
      return;
    }

    // 🔥 GET ALL EMAIL ACCOUNTS
    const [emailAccounts] = await conn.query(
      `SELECT
         from_name,
         from_email AS email,
         smtp_username AS smtp_user,
         smtp_password AS app_password,
         smtp_host,
         smtp_port,
         smtp_security
       FROM user_email_accounts
       WHERE user_id = ?`,
      [campaign.user_id]
    );

    if (!emailAccounts.length) {
      throw new Error("No email accounts found");
    }

    console.log(`📮 Using ${emailAccounts.length} sender accounts`);

    let sentCount = 0;
    let failedCount = 0;
    let accountIndex = 0;

    for (const lead of leads) {
      const emailAccount = emailAccounts[accountIndex];
      accountIndex = (accountIndex + 1) % emailAccounts.length;

      const transporter = createTransporter(emailAccount);

      try {
        const [templates] = await conn.query(
          `SELECT content FROM email_templates WHERE id = ?`,
          [campaign.template_id]
        );

        let emailContent = templates[0]?.content || "";

        emailContent = emailContent.replace(/\{\{email\}\}/gi, lead.email);
        if (lead.name) {
          emailContent = emailContent.replace(/\{\{name\}\}/gi, lead.name);
        }

        const trackingPixel = `
          <img src="${process.env.APP_URL}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(
            lead.email
          )}&t=${Date.now()}"
          width="1" height="1" style="display:none" />
        `;

        emailContent = emailContent.includes("</body>")
          ? emailContent.replace("</body>", `${trackingPixel}</body>`)
          : emailContent + trackingPixel;

        await transporter.sendMail({
          from: `"${emailAccount.from_name || "Campaign"}" <${emailAccount.email}>`,
          to: lead.email,
          subject: campaign.subject,
          html: emailContent
        });

        await conn.query(
          `UPDATE campaign_data
           SET status = 'sent',
               sent_at = NOW(),
               sent_from_email = ?
           WHERE campaign_id = ? AND email = ?`,
          [emailAccount.email, campaign.id, lead.email]
        );

        sentCount++;
        this.stats.totalSent++;

        console.log(`✅ ${lead.email} ← ${emailAccount.email}`);

        await this.delay(200);

      } catch (err) {
        failedCount++;
        this.stats.totalFailed++;

        await conn.query(
          `UPDATE campaign_data
           SET status = 'failed',
               error_message = ?,
               sent_from_email = ?
           WHERE campaign_id = ? AND email = ?`,
          [err.message, emailAccount.email, campaign.id, lead.email]
        );

        console.error(`❌ ${lead.email} via ${emailAccount.email}`);
      }
    }

    await conn.query(
      `UPDATE email_campaigns
       SET status = 'sent',
           sent_count = ?,
           failed_count = ?,
           completed_at = NOW()
       WHERE id = ?`,
      [sentCount, failedCount, campaign.id]
    );

    console.log(`🎉 Campaign done → Sent: ${sentCount}, Failed: ${failedCount}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new EmailScheduler();
