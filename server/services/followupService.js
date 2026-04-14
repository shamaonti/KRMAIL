// services/followupService.js
const pool = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");
const { getCurrentISTMysqlDatetime } = require("../helpers/time");

class FollowupService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
  }

  startProcessor() {
    if (this.processingInterval) return;
    this.processingInterval = setInterval(async () => {
      await this.processFollowupQueue();
    }, 60 * 1000);
    console.log("🔄 Follow-up processor started (1 min interval)");
  }

  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // ─── PROCESS QUEUE ──────────────────────────────────────────────────────────
  async processFollowupQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const followups = await this.getPendingFollowups();
      console.log(`\n📬 Follow-up queue: ${followups.length} due`);

      for (const followup of followups) {
        await this.processFollowup(followup);
      }
    } catch (err) {
      console.error("Follow-up processing error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  // ─── GET PENDING FOLLOWUPS ──────────────────────────────────────────────────
  async getPendingFollowups() {
    // ✅ Join campaign_data for lead payload/name (for placeholder merge)
    // ✅ Join email_campaigns for user_id + original_subject
    const nowIST = getCurrentISTMysqlDatetime();
    const [rows] = await pool.execute(`
      SELECT
        fq.*,
        et.content        AS template_content,
        ec.user_id        AS user_id,
        ec.subject        AS original_subject,
        cd.payload        AS lead_payload,
        cd.name           AS lead_name,
        DATE_FORMAT(fq.scheduled_at, '%Y-%m-%d %H:%i:%s') AS scheduled_at_fmt,
        DATE_FORMAT(fq.created_at,   '%Y-%m-%d %H:%i:%s') AS created_at_fmt
      FROM followup_queue fq
      LEFT JOIN email_templates et ON fq.followup_template_id = et.id
      LEFT JOIN email_campaigns ec ON fq.campaign_id          = ec.id
      LEFT JOIN campaign_data   cd ON cd.campaign_id = fq.campaign_id
                                   AND LOWER(TRIM(cd.email)) = LOWER(TRIM(fq.email))
      WHERE fq.status      = 'pending'
        AND fq.scheduled_at <= ?
      ORDER BY fq.scheduled_at ASC
    `, [nowIST]);

    return rows;
  }

  // ─── MERGE PLACEHOLDERS ─────────────────────────────────────────────────────
  mergePlaceholders(content, lead, signature = "") {
    let out = content;

    let payloadObj = {};
    try {
      payloadObj = lead.payload
        ? typeof lead.payload === "string"
          ? JSON.parse(lead.payload)
          : lead.payload
        : {};
    } catch (_) {
      payloadObj = {};
    }

    const name    = lead.name  || payloadObj.name  || payloadObj.Name  || "";
    const email   = lead.email || payloadObj.email || payloadObj.Email || "";
    const sigHtml = signature ? String(signature).replace(/\n/g, "<br>") : "";

    const allFields = {
      name,      Name: name,
      email,     Email: email,
      Signature: sigHtml,
      signature: sigHtml,
      ...payloadObj,
    };

    for (const [key, value] of Object.entries(allFields)) {
      const safe = String(value ?? "");
      out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
      out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"), safe);
    }

    return out;
  }

  // ─── GET SMTP ACCOUNT ───────────────────────────────────────────────────────
  async getEmailAccount(userId) {
    const [rows] = await pool.execute(
      `SELECT
         id,
         from_name,
         from_email        AS email,
         smtp_username     AS smtp_user,
         smtp_password     AS app_password,
         smtp_host,
         smtp_port,
         smtp_security,
         signature,
         daily_limit
       FROM user_email_accounts
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  // ─── PROCESS SINGLE FOLLOWUP ────────────────────────────────────────────────
  async processFollowup(followup) {
    try {
      console.log(
        `\n📧 Follow-up #${followup.id} → ${followup.email}` +
        ` | scheduled: ${followup.scheduled_at_fmt}` +
        ` | condition: ${followup.condition}`
      );

      // ─── Condition checks ────────────────────────────────────────────────────
      if (followup.condition === "not_opened" && followup.email_log_id) {
        const opened = await this.checkEmailOpened(followup.email_log_id);
        if (opened) {
          await this.updateFollowupStatus(followup.id, "cancelled", "Email was opened");
          console.log(`🚫 Cancelled — email was opened`);
          return;
        }
      }

      if (followup.condition === "not_clicked" && followup.email_log_id) {
        const clicked = await this.checkEmailClicked(followup.email_log_id);
        if (clicked) {
          await this.updateFollowupStatus(followup.id, "cancelled", "Email was clicked");
          console.log(`🚫 Cancelled — email was clicked`);
          return;
        }
      }

      // ─── Unsubscribe check ───────────────────────────────────────────────────
      const [unsubRows] = await pool.execute(
        `SELECT id FROM unsubscribes
         WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
           AND user_id = ?
           AND (scope = 'all' OR (scope = 'campaign' AND campaign_id = ?))
         LIMIT 1`,
        [followup.email, followup.user_id, followup.campaign_id]
      );

      if (unsubRows.length > 0) {
        await this.updateFollowupStatus(followup.id, "cancelled", "Email unsubscribed");
        console.log(`🚫 Cancelled — ${followup.email} is unsubscribed`);
        return;
      }

      // ─── Fetch SMTP account ──────────────────────────────────────────────────
      const emailAccount = await this.getEmailAccount(followup.user_id);
      if (!emailAccount) {
        await this.updateFollowupStatus(followup.id, "failed", "No email account configured");
        console.error(`❌ No SMTP account for user ${followup.user_id}`);
        return;
      }

      // ─── Build lead object ───────────────────────────────────────────────────
      const lead = {
        email:   followup.email,
        name:    followup.lead_name  || "",
        payload: followup.lead_payload || "{}",
      };

      // ─── Build email content ─────────────────────────────────────────────────
      const rawContent =
        followup.template_content || `<p>This is a follow-up email.</p>`;

      let emailContent = this.mergePlaceholders(
        rawContent,
        lead,
        emailAccount.signature || ""
      );

      const appUrl = process.env.APP_URL || "http://localhost:3001";

      // Tracking pixel (tagged as followup)
      emailContent += `<img src="${appUrl}/api/track/open?cid=${followup.campaign_id}&email=${encodeURIComponent(followup.email)}&t=${Date.now()}&followup=1" width="1" height="1" style="display:none" />`;

      // Unsubscribe link
      const token = sign({
        email:      followup.email.toLowerCase().trim(),
        userId:     followup.user_id,
        campaignId: followup.campaign_id,
        scope:      "all",
        exp:        Date.now() + 365 * 24 * 60 * 60 * 1000,
      });

      const unsubUrl = `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;

      emailContent += `
        <hr/>
        <p style="font-size:12px;color:#666;font-family:sans-serif;">
          Don't want these emails? <a href="${unsubUrl}">Unsubscribe</a>
        </p>`;

      // ─── Send via SMTP ───────────────────────────────────────────────────────
      const transporter = createTransporter(emailAccount);
      const subject     = followup.followup_subject ||
                          `Follow-up: ${followup.original_subject || ""}`;

      await transporter.sendMail({
        from:    `"${emailAccount.from_name || "Campaign"}" <${emailAccount.email}>`,
        to:      followup.email,
        subject,
        html:    emailContent,
        headers: {
          "List-Unsubscribe":      `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      // ✅ Mark sent with sent_at datetime
      await this.updateFollowupStatus(followup.id, "sent");
      console.log(
        `✅ Follow-up sent → ${followup.email} via ${emailAccount.email}` +
        ` | sent_at: ${new Date().toLocaleString()}`
      );

    } catch (err) {
      console.error(`❌ Follow-up #${followup.id} error:`, err);
      await this.updateFollowupStatus(followup.id, "failed", err.message);
    }
  }

  // ─── CHECK OPENED / CLICKED ─────────────────────────────────────────────────
  async checkEmailOpened(emailLogId) {
    const [rows] = await pool.execute(
      "SELECT opened_at FROM email_logs WHERE id = ? AND opened_at IS NOT NULL",
      [emailLogId]
    );
    return rows.length > 0;
  }

  async checkEmailClicked(emailLogId) {
    const [rows] = await pool.execute(
      "SELECT clicked_at FROM email_logs WHERE id = ? AND clicked_at IS NOT NULL",
      [emailLogId]
    );
    return rows.length > 0;
  }

  // ─── UPDATE STATUS (with sent_at datetime) ──────────────────────────────────
  async updateFollowupStatus(id, status, errorMessage = null) {
    // ✅ sent_at = NOW() only when status = 'sent', else NULL preserved
    await pool.execute(
      `UPDATE followup_queue
       SET status        = ?,
           sent_at       = CASE WHEN ? = 'sent' THEN NOW() ELSE sent_at END,
           error_message = ?,
           updated_at    = NOW()
       WHERE id = ?`,
      [status, status, errorMessage, id]
    );
  }

  // ─── GET FOLLOWUP STATS (for dashboard) ─────────────────────────────────────
  async getFollowupStats(campaignId) {
    const [rows] = await pool.execute(
      `SELECT
         status,
         COUNT(*)                                              AS count,
         MIN(scheduled_at)                                    AS earliest_scheduled,
         MAX(sent_at)                                         AS latest_sent,
         DATE_FORMAT(MIN(scheduled_at), '%Y-%m-%d %H:%i:%s') AS earliest_scheduled_fmt,
         DATE_FORMAT(MAX(sent_at),      '%Y-%m-%d %H:%i:%s') AS latest_sent_fmt
       FROM followup_queue
       WHERE campaign_id = ?
       GROUP BY status`,
      [campaignId]
    );
    return rows;
  }
}

module.exports = new FollowupService();
