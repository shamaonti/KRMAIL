const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

/**
 * EMAIL SCHEDULER SERVICE
 * Sends scheduled campaigns using ALL sender accounts (round-robin)
 * ✅ Global unsubscribe safe (once unsubscribed = never email again)
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

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  async triggerManually() {
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

  async sendCampaign(conn, campaign) {
    console.log(`\n📧 Campaign: "${campaign.name}" (id: ${campaign.id})`);

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


    let sentCount = 0;
    let failedCount = 0;
    let skippedUnsubCount = 0;

    try {
      /**
       * 🔐 GLOBAL UNSUBSCRIBE RULE
       * If email exists in unsubscribes table for this user → DO NOT SEND
       * Campaign id is ignored intentionally
       */
      const [leads] = await conn.query(
        `SELECT cd.email, cd.name, cd.payload, cd.status
         FROM campaign_data cd
         LEFT JOIN unsubscribes u
           ON LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))
          AND u.user_id = ?
         WHERE cd.campaign_id = ?
           AND cd.status != 'unsubscribed'
           AND u.id IS NULL`,
        [campaign.user_id, campaign.id]
      );

      if (!leads.length) {
        console.log("🚫 All leads unsubscribed or empty");
        return;
      }

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
        console.error("❌ No email accounts for user:", campaign.user_id);
        return;
      }

      console.log(`📮 Using ${emailAccounts.length} sender account(s), ${leads.length} lead(s)`);

      let accountIndex = 0;

      const [templates] = await conn.query(
        `SELECT content FROM email_templates WHERE id = ?`,
        [campaign.template_id]
      );
      const templateContent = templates?.[0]?.content || "";

      for (const lead of leads) {
        const leadEmailNorm = this.normalizeEmail(lead.email);

        if ((lead.status || "").toLowerCase() === "unsubscribed") {
          skippedUnsubCount++;
          continue;
        }

        const emailAccount = emailAccounts[accountIndex];
        accountIndex = (accountIndex + 1) % emailAccounts.length;
        const transporter = createTransporter(emailAccount);

        try {
          let emailContent = this.mergePlaceholders(templateContent, lead);

          const trackingPixel = `<img src="${process.env.APP_URL}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(lead.email)}&t=${Date.now()}" width="1" height="1" style="display:none" />`;
          emailContent += trackingPixel;

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

          await transporter.sendMail({
            from: `"${emailAccount.from_name || "Campaign"}" <${emailAccount.email}>`,
            to: lead.email,
            subject: campaign.subject,
            html: emailContent,
          });

          await conn.query(
            `UPDATE campaign_data
             SET status = 'sent', sent_at = NOW(), sent_from_email = ?
             WHERE campaign_id = ? AND LOWER(TRIM(email)) = ?`,
            [emailAccount.email, campaign.id, leadEmailNorm]
          );

          sentCount++;
          console.log(`✅ ${lead.email} ← ${emailAccount.email}`);
          await this.delay(200);
        } catch (err) {
          failedCount++;
          await conn.query(
            `UPDATE campaign_data
             SET status = 'failed', error_message = ?, sent_from_email = ?
             WHERE campaign_id = ? AND LOWER(TRIM(email)) = ?`,
            [String(err?.message || err), emailAccount.email, campaign.id, leadEmailNorm]
          );
          console.error(`❌ ${lead.email}:`, err?.message || err);
        }
      }

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

      console.log(`🎉 Done → Sent: ${sentCount}, Failed: ${failedCount}, Skipped (unsub): ${skippedUnsubCount}`);
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
}

module.exports = new EmailScheduler();
