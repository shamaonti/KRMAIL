// services/emailScheduler.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

/**
 * EMAIL SCHEDULER SERVICE
 * ✅ scope='all'     → us user ke kisi bhi campaign mein email nahi jayegi
 * ✅ scope='campaign' → sirf us specific campaign mein block hogi
 * ✅ Unsubscribed leads NEVER overwritten with 'sent' (id + status guard)
 * ✅ unsubscribed_count correctly saved after each batch + final
 * ✅ daily_limit respected per email account
 * ✅ Distributes evenly across accounts based on max_level
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

  mergePlaceholders(content, lead) {
    let out = content;

    const name = lead.name || "";
    const email = lead.email || "";
    const payload = lead.payload
      ? typeof lead.payload === "string"
        ? JSON.parse(lead.payload)
        : lead.payload
      : {};

    const allFields = { name, email, Name: name, Email: email, ...payload };

    for (const [key, value] of Object.entries(allFields)) {
      const safe = String(value || "");
      out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
      out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"), safe);
    }

    return out;
  }

  getAppUrl() {
    return process.env.APP_URL || "http://localhost:3001";
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
      const dailyLimit = Number(account.daily_limit || 0);
      const remaining = Math.max(0, dailyLimit - sentCount);

      accountsWithCapacity.push({
        ...account,
        sentToday: sentCount,
        remainingToday: remaining,
      });
    }

    return accountsWithCapacity;
  }

  distributeLeadsToAccounts(leads, emailAccounts, maxLevel) {
    const distribution = [];

    const totalCapacity = emailAccounts.reduce(
      (sum, acc) => sum + (acc.remainingToday || 0),
      0
    );

    if (totalCapacity === 0) {
      console.log("⚠️ No sending capacity available today");
      return [];
    }

    const batchSize = Math.min(
      emailAccounts.length * maxLevel,
      leads.length,
      totalCapacity
    );

    console.log(
      `📊 Batch size: ${batchSize} (${emailAccounts.length} accounts × ${maxLevel} max_level)`
    );

    let leadIndex = 0;
    let accountIndex = 0;

    while (leadIndex < batchSize && leadIndex < leads.length) {
      const account = emailAccounts[accountIndex];

      if ((account.remainingToday || 0) <= 0) {
        accountIndex = (accountIndex + 1) % emailAccounts.length;
        if (emailAccounts.every((acc) => (acc.remainingToday || 0) <= 0)) {
          console.log("⚠️ All accounts reached daily limit");
          break;
        }
        continue;
      }

      const accountBatchLimit = Math.min(
        maxLevel,
        account.remainingToday,
        batchSize - leadIndex
      );

      for (
        let i = 0;
        i < accountBatchLimit && leadIndex < batchSize && leadIndex < leads.length;
        i++
      ) {
        distribution.push({ lead: leads[leadIndex], account });
        leadIndex++;
        account.remainingToday--;
      }

      accountIndex = (accountIndex + 1) % emailAccounts.length;
    }

    return distribution;
  }

  // ✅ campaign_data se live unsubscribed count
  async getUnsubscribedCount(conn, campaignId) {
    const [result] = await conn.query(
      `SELECT COUNT(*) as cnt
       FROM campaign_data
       WHERE campaign_id = ? AND status = 'unsubscribed'`,
      [campaignId]
    );
    return Number(result[0]?.cnt || 0);
  }

  async sendCampaign(conn, campaign) {
    console.log(`\n📧 Campaign: "${campaign.name}" (id: ${campaign.id})`);

    const maxLevel = campaign.max_level || 100;
    const delayMs = campaign.delay_ms || 200;

    console.log(`⚙️ Settings: max_level=${maxLevel}, delay_ms=${delayMs}ms`);

    /**
     * ✅ STEP 1: Pending leads ko unsubscribed mark karo
     *
     * scope='all'      → sirf user_id match kaafi hai (campaign_id koi bhi ho)
     * scope='campaign' → user_id + campaign_id dono match karna chahiye
     *
     * ONLY status='pending' rows update hote hain
     * Already 'sent' / 'unsubscribed' rows safe hain
     */
    const [unsubMarkResult] = await conn.query(
      `UPDATE campaign_data cd
       JOIN unsubscribes u
         ON LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))
        AND u.user_id = ?
        AND (
              u.scope = 'all'
              OR (
                u.scope = 'campaign'
                AND CAST(u.campaign_id AS UNSIGNED) = CAST(cd.campaign_id AS UNSIGNED)
              )
            )
       SET cd.status = 'unsubscribed'
       WHERE cd.campaign_id = ?
         AND cd.status = 'pending'`,
      [campaign.user_id, campaign.id]
    );

    console.log(`🚫 Marked ${unsubMarkResult.affectedRows || 0} leads as unsubscribed before sending`);

    let totalSent = 0;
    let totalFailed = 0;
    let batchNumber = 0;

    try {
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

      await conn.query(
        `UPDATE email_campaigns SET status = 'sending', updated_at = NOW() WHERE id = ?`,
        [campaign.id]
      );

      while (true) {
        batchNumber++;
        console.log(`\n🔄 === BATCH ${batchNumber} ===`);

        /**
         * ✅ STEP 2: Sirf 'pending' leads pull karo
         * unsubscribed leads yahan aayenge hi nahi (STEP 1 ne mark kar diya)
         * id SELECT karo — update row-safe hoga
         */
        const [leads] = await conn.query(
          `SELECT cd.id, cd.email, cd.name, cd.payload
           FROM campaign_data cd
           WHERE cd.campaign_id = ?
             AND cd.status = 'pending'`,
          [campaign.id]
        );

        if (!leads.length) {
          console.log("✅ Stack empty - All emails processed!");
          break;
        }

        console.log(`📬 Pending leads in stack: ${leads.length}`);

        const emailAccounts = await this.getEmailAccountCapacity(conn, campaign.user_id);
        if (!emailAccounts.length) {
          console.error("❌ No email accounts for user:", campaign.user_id);
          break;
        }

        const totalCapacity = emailAccounts.reduce(
          (sum, acc) => sum + (acc.remainingToday || 0),
          0
        );

        if (totalCapacity === 0) {
          console.log("⚠️ All accounts reached daily limit - stopping");
          break;
        }

        console.log("\n📮 Email Account Capacities:");
        emailAccounts.forEach((acc) => {
          console.log(
            `   ${acc.email}: ${acc.sentToday}/${acc.daily_limit} sent today, ${acc.remainingToday} remaining`
          );
        });

        const distribution = this.distributeLeadsToAccounts(leads, emailAccounts, maxLevel);
        if (!distribution.length) {
          console.log("⚠️ No emails can be sent in this batch");
          break;
        }

        console.log(`🎯 Sending batch ${batchNumber} (${distribution.length} emails)...`);

        let batchSent = 0;
        let batchFailed = 0;
        const appUrl = this.getAppUrl();

        for (const item of distribution) {
          const { lead, account } = item;
          const leadEmailNorm = this.normalizeEmail(lead.email);
          const transporter = createTransporter(account);

          try {
            let emailContent = this.mergePlaceholders(templateContent, lead);

            const trackingPixel = `<img src="${appUrl}/api/track/open?cid=${campaign.id}&email=${encodeURIComponent(
              lead.email
            )}&t=${Date.now()}" width="1" height="1" style="display:none" />`;
            emailContent += trackingPixel;

            const token = sign({
              email: leadEmailNorm,
              userId: campaign.user_id,
              campaignId: campaign.id,
              scope: "all",
              exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
            });

            const unsubUrl = `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;

            emailContent += `
              <hr/>
              <p style="font-size:12px;color:#666">
                Don't want these emails?
                <a href="${unsubUrl}">Unsubscribe</a>
              </p>`;

            await transporter.sendMail({
              from: `"${account.from_name || "Campaign"}" <${account.email}>`,
              to: lead.email,
              subject: campaign.subject,
              html: emailContent,
              headers: {
                "List-Unsubscribe": `<${unsubUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            });

            /**
             * ✅ CRITICAL:
             * id use karo (email nahi) — row-safe
             * AND status = 'pending' guard — unsubscribed rows KABHI overwrite nahi honge
             */
            await conn.query(
              `UPDATE campaign_data
               SET status = 'sent', sent_at = NOW(), sent_from_email = ?
               WHERE id = ? AND status = 'pending'`,
              [account.email, lead.id]
            );

            batchSent++;
            totalSent++;
            console.log(`✅ [${batchSent}/${distribution.length}] ${lead.email} ← ${account.email}`);

            await this.delay(delayMs);
          } catch (err) {
            batchFailed++;
            totalFailed++;

            await conn.query(
              `UPDATE campaign_data
               SET status = 'failed', error_message = ?, sent_from_email = ?
               WHERE id = ? AND status = 'pending'`,
              [String(err?.message || err), account.email, lead.id]
            );

            console.error(`❌ ${lead.email}:`, err?.message || err);
          }
        }

        console.log(`\n🎉 Batch ${batchNumber} Complete → Sent: ${batchSent}, Failed: ${batchFailed}`);

        // ✅ Har batch ke baad unsubscribed_count update karo
        const batchUnsubCount = await this.getUnsubscribedCount(conn, campaign.id);

        await conn.query(
          `UPDATE email_campaigns
           SET sent_count = ?,
               failed_count = ?,
               unsubscribed_count = ?,
               status = 'sending',
               updated_at = NOW()
           WHERE id = ?`,
          [totalSent, totalFailed, batchUnsubCount, campaign.id]
        );

        console.log(`📊 Unsubscribed so far: ${batchUnsubCount}`);

        const [remaining] = await conn.query(
          `SELECT COUNT(*) as count
           FROM campaign_data
           WHERE campaign_id = ? AND status = 'pending'`,
          [campaign.id]
        );

        if ((remaining[0]?.count || 0) > 0) {
          console.log(
            `⏳ ${remaining[0].count} leads remaining - waiting ${delayMs}ms before next batch...`
          );
          await this.delay(delayMs);
        } else {
          console.log("✅ Stack empty - All emails sent!");
          break;
        }
      }

      // ✅ Final completion — unsubscribed_count bhi save karo
      const finalUnsubCount = await this.getUnsubscribedCount(conn, campaign.id);

      await conn.query(
        `UPDATE email_campaigns
         SET status = 'sent',
             sent_count = ?,
             failed_count = ?,
             unsubscribed_count = ?,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [totalSent, totalFailed, finalUnsubCount, campaign.id]
      );

      console.log(`\n🏁 CAMPAIGN COMPLETE!`);
      console.log(`📊 Total Batches: ${batchNumber}`);
      console.log(`📧 Total Sent: ${totalSent}`);
      console.log(`❌ Total Failed: ${totalFailed}`);
      console.log(`🚫 Total Unsubscribed: ${finalUnsubCount}`);

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
      isRunning: this.cronJob !== null,
    };
  }
}

module.exports = new EmailScheduler();