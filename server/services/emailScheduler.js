const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

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

  pause()  { this.isPaused = true;  }
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

  // ✅ Single brace {Name} AND double brace {{name}} dono support
  mergePlaceholders(content, lead) {
    let out = content;

    const name  = lead.name  || "";
    const email = lead.email || "";
    const payload = lead.payload
      ? (typeof lead.payload === "string" ? JSON.parse(lead.payload) : lead.payload)
      : {};

    const allFields = {
      name, email,
      Name: name, Email: email,
      ...payload,
    };

    for (const [key, value] of Object.entries(allFields)) {
      const safe = String(value || "");
      out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
      out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`,       "gi"), safe);
    }

    return out;
  }

  // ✅ FIX: unsubscribes table missing hone pe crash nahi — false return karega
  async isUnsubscribed(conn, emailNorm, campaignId) {
    try {
      const [unsub] = await conn.query(
        `SELECT 1 FROM unsubscribes
         WHERE LOWER(TRIM(email)) = ?
           AND (scope = 'all' OR (scope = 'campaign' AND campaign_id = ?))
         LIMIT 1`,
        [emailNorm, campaignId]
      );
      return unsub.length > 0;
    } catch (err) {
      // Table exist nahi karti — silently skip, email send karo
      if (err.code === "ER_NO_SUCH_TABLE") {
        return false; // unsubscribed nahi maano
      }
      throw err; // doosri errors propagate karo
    }
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

    await conn.query(
      `UPDATE email_campaigns SET status = 'sending', updated_at = NOW() WHERE id = ?`,
      [campaign.id]
    );

    let sentCount         = 0;
    let failedCount       = 0;
    let skippedUnsubCount = 0;

    try {
      // ── Leads ─────────────────────────────────────────────────────────
      const [leads] = await conn.query(
        `SELECT email, name, payload, status FROM campaign_data WHERE campaign_id = ?`,
        [campaign.id]
      );

      if (!leads.length) {
        await conn.query(
          `UPDATE email_campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?`,
          [campaign.id]
        );
        console.error("❌ No leads for campaign:", campaign.id);
        return;
      }

      // ── Sender accounts ───────────────────────────────────────────────
      const [emailAccounts] = await conn.query(
        `SELECT
           from_name,
           from_email    AS email,
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
        await conn.query(
          `UPDATE email_campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?`,
          [campaign.id]
        );
        console.error("❌ No email accounts for user:", campaign.user_id);
        return;
      }

      console.log(`📮 Using ${emailAccounts.length} sender account(s), ${leads.length} lead(s)`);

      let accountIndex = 0;

      // ── Template (ek baar fetch) ───────────────────────────────────────
      const [templates] = await conn.query(
        `SELECT content FROM email_templates WHERE id = ?`,
        [campaign.template_id]
      );
      const templateContent = templates?.[0]?.content || "";

      // ── Per-lead loop ──────────────────────────────────────────────────
      for (const lead of leads) {
        const leadEmailNorm = this.normalizeEmail(lead.email);

        // Already unsubscribed in campaign_data
        if ((lead.status || "").toLowerCase() === "unsubscribed") {
          skippedUnsubCount++;
          continue;
        }

        // ✅ Safe unsubscribe check — table nahi hai toh bhi kaam karega
        const unsubscribed = await this.isUnsubscribed(conn, leadEmailNorm, campaign.id);
        if (unsubscribed) {
          skippedUnsubCount++;
          console.log(`🚫 Unsubscribed - skipping: ${lead.email}`);
          await conn.query(
            `UPDATE campaign_data SET status = 'unsubscribed'
             WHERE campaign_id = ? AND LOWER(TRIM(email)) = ?`,
            [campaign.id, leadEmailNorm]
          );
          continue;
        }

        const emailAccount = emailAccounts[accountIndex];
        accountIndex = (accountIndex + 1) % emailAccounts.length;
        const transporter = createTransporter(emailAccount);

        try {
          // {Name}/{Company}/{{name}} sab replace
          let emailContent = this.mergePlaceholders(templateContent, lead);

          // Tracking pixel
          const trackingPixel = `<img src="${process.env.APP_URL}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(lead.email)}&t=${Date.now()}" width="1" height="1" style="display:none" />`;
          emailContent = emailContent.includes("</body>")
            ? emailContent.replace("</body>", `${trackingPixel}</body>`)
            : emailContent + trackingPixel;

          // Unsubscribe footer
          const token = sign({
            email: leadEmailNorm,
            userId: campaign.user_id,
            campaignId: campaign.id,
            scope: "campaign",
            exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
          });
          const unsubscribeUrl = `${process.env.APP_URL}/unsubscribe?token=${token}`;
          const unsubscribeFooter = `
            <hr/>
            <p style="font-size:12px;color:#666">
              Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>`;
          emailContent = emailContent.includes("</body>")
            ? emailContent.replace("</body>", `${unsubscribeFooter}</body>`)
            : emailContent + unsubscribeFooter;

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
          this.stats.totalSent++;
          console.log(`✅ ${lead.email} ← ${emailAccount.email}`);
          await this.delay(200);

        } catch (err) {
          failedCount++;
          this.stats.totalFailed++;
          await conn.query(
            `UPDATE campaign_data
             SET status = 'failed', error_message = ?, sent_from_email = ?
             WHERE campaign_id = ? AND LOWER(TRIM(email)) = ?`,
            [String(err?.message || err), emailAccount.email, campaign.id, leadEmailNorm]
          );
          console.error(`❌ ${lead.email} via ${emailAccount.email}:`, err?.message || err);
        }
      }

      // ── Final status update ────────────────────────────────────────────
      try {
        await conn.query(
          `UPDATE email_campaigns
           SET status = 'sent', sent_count = ?, failed_count = ?,
               completed_at = NOW(), updated_at = NOW()
           WHERE id = ?`,
          [sentCount, failedCount, campaign.id]
        );
      } catch (e) {
        await conn.query(
          `UPDATE email_campaigns
           SET status = 'sent', sent_count = ?, updated_at = NOW()
           WHERE id = ?`,
          [sentCount, campaign.id]
        );
      }

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
