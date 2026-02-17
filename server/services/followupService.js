const emailService = require("./emailService");
const pool = require("../db");

class FollowupService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
  }

  // =========================
  // START CRON PROCESSOR
  // =========================
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

  // =========================
  // PROCESS QUEUE
  // =========================
  async processFollowupQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const followups = await this.getPendingFollowups();

      for (const followup of followups) {
        await this.processFollowup(followup);
      }

    } catch (err) {
      console.error("Follow-up processing error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  // =========================
  // GET PENDING FOLLOWUPS
  // =========================
  async getPendingFollowups() {
    const [rows] = await pool.execute(`
      SELECT fq.*, et.content as template_content
      FROM followup_queue fq
      LEFT JOIN email_templates et ON fq.followup_template_id = et.id
      WHERE fq.status = 'pending'
      AND fq.scheduled_at <= NOW()
      ORDER BY fq.scheduled_at ASC
    `);

    return rows;
  }

  // =========================
  // PROCESS SINGLE FOLLOWUP
  // =========================
  async processFollowup(followup) {
    try {
      console.log(`📧 Processing follow-up for ${followup.email}`);

      const emailLogId = followup.email_log_id;

      // Condition: not_opened
      if (followup.condition === "not_opened" && emailLogId) {
        const opened = await this.checkEmailOpened(emailLogId);
        if (opened) {
          await this.updateFollowupStatus(followup.id, "cancelled", "Email opened");
          return;
        }
      }

      // Condition: not_clicked
      if (followup.condition === "not_clicked" && emailLogId) {
        const clicked = await this.checkEmailClicked(emailLogId);
        if (clicked) {
          await this.updateFollowupStatus(followup.id, "cancelled", "Email clicked");
          return;
        }
      }

      // Build email content
      const content =
        followup.template_content ||
        `<p>This is a follow-up email.</p>`;

      const result = await emailService.sendEmail({
        to: followup.email,
        subject:
          followup.followup_subject ||
          "Follow-up: " + (followup.original_subject || ""),
        htmlBody: content,
      });

      if (result.success) {
        await this.updateFollowupStatus(followup.id, "sent");
        console.log(`✅ Follow-up sent to ${followup.email}`);
      } else {
        await this.updateFollowupStatus(followup.id, "failed", result.error);
      }

    } catch (err) {
      console.error("Follow-up error:", err);
      await this.updateFollowupStatus(followup.id, "failed", err.message);
    }
  }

  // =========================
  // CHECK OPENED
  // =========================
  async checkEmailOpened(emailLogId) {
    const [rows] = await pool.execute(
      "SELECT opened_at FROM email_logs WHERE id = ? AND opened_at IS NOT NULL",
      [emailLogId]
    );
    return rows.length > 0;
  }

  // =========================
  // CHECK CLICKED
  // =========================
  async checkEmailClicked(emailLogId) {
    const [rows] = await pool.execute(
      "SELECT clicked_at FROM email_logs WHERE id = ? AND clicked_at IS NOT NULL",
      [emailLogId]
    );
    return rows.length > 0;
  }

  // =========================
  // UPDATE STATUS
  // =========================
  async updateFollowupStatus(id, status, errorMessage = null) {
    await pool.execute(
      `
      UPDATE followup_queue
      SET status = ?,
          sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE NULL END,
          error_message = ?
      WHERE id = ?
      `,
      [status, status, errorMessage, id]
    );
  }

  // =========================
  // SCHEDULE FOLLOWUP
  // =========================
  async scheduleFollowup(data) {
    const {
      campaignId,
      contactId,
      emailLogId,
      userId,
      email,
      followupTemplateId,
      followupSubject,
      delayHours,
      condition,
    } = data;

    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + delayHours);

    const [result] = await pool.execute(
      `
      INSERT INTO followup_queue
      (campaign_id, contact_id, email_log_id, user_id, email,
       followup_template_id, followup_subject, scheduled_at, condition, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        campaignId,
        contactId,
        emailLogId,
        userId,
        email,
        followupTemplateId,
        followupSubject,
        scheduledAt,
        condition || null,
      ]
    );

    return {
      success: true,
      id: result.insertId,
      scheduledAt,
    };
  }
}

module.exports = new FollowupService();
