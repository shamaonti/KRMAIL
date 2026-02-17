const emailService = require("./emailService");
const databaseService = require("./databaseService");

class FollowupService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    this.inMemoryFollowups = [];
  }

  startProcessor() {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.processFollowupQueue();
    }, 1 * 60 * 1000);

    console.log("🔄 Follow-up email processor started (checking every 1 minute)");
  }

  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log("⏹️ Follow-up email processor stopped");
    }
  }

  async processFollowupQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const pendingFollowups = await this.getPendingFollowups();
      for (const followup of pendingFollowups) {
        await this.processFollowup(followup);
      }
    } catch (error) {
      console.error("Error processing follow-up queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getPendingFollowups() {
    try {
      if (databaseService.isConnected) {
        return await databaseService.getPendingFollowups();
      }
    } catch (error) {
      console.log("📝 Database not available, using in-memory follow-up storage");
    }
    return this.getInMemoryPendingFollowups();
  }

  async processFollowup(followup) {
    try {
      console.log(`📧 Processing follow-up for ${followup.email} (condition=${followup.condition})`);

      const emailLogId = followup.email_log_id ?? null;

      // ✅ Condition: not_opened (skip check if email_log_id is null)
      if (followup.condition === "not_opened" && emailLogId) {
        const wasOpened = await this.safeCheckOpened(emailLogId);
        if (wasOpened) {
          console.log(`📧 Skipping follow-up for ${followup.email} - original email was opened`);
          await this.updateFollowupStatus(followup.id, "cancelled", "Original email was opened");
          return;
        }
      }

      // ✅ Condition: not_clicked (skip check if email_log_id is null)
      if (followup.condition === "not_clicked" && emailLogId) {
        const wasClicked = await this.safeCheckClicked(emailLogId);
        if (wasClicked) {
          console.log(`📧 Skipping follow-up for ${followup.email} - original email was clicked`);
          await this.updateFollowupStatus(followup.id, "cancelled", "Original email was clicked");
          return;
        }
      }

      // ✅ Condition: no_reply (NEW)
      // If reply exists -> cancel. If no reply -> send.
      if (followup.condition === "no_reply") {
        const replied = await this.safeCheckReplied({
          campaignId: followup.campaign_id,
          email: followup.email,
          emailLogId,
        });

        if (replied) {
          console.log(`📧 Skipping follow-up for ${followup.email} - reply received`);
          await this.updateFollowupStatus(followup.id, "cancelled", "Reply received");
          return;
        }
      }

      // Build follow-up email body
      let followupContent = followup.template_content;
      if (!followupContent) {
        const minutesAgo = Math.floor(
          (Date.now() - new Date(followup.createdAt || followup.created_at || Date.now()).getTime()) /
            (1000 * 60)
        );
        followupContent = `
          <h2>Follow-up Email</h2>
          <p>Hi there,</p>
          <p>This is a follow-up email sent ${minutesAgo} minutes after the original email.</p>
          <p>Thank you for your interest!</p>
          <p>Best regards,<br/>The MailSkrap Team</p>
        `;
      }

      const result = await emailService.sendEmail({
        to: followup.email,
        subject:
          followup.followup_subject ||
          "Follow-up: " + (followup.original_subject || "Your previous email"),
        htmlBody: followupContent,
        from: null,
      });

      if (result.success) {
        await this.updateFollowupStatus(followup.id, "sent");
        console.log(`✅ Follow-up sent successfully to ${followup.email}`);
      } else {
        await this.updateFollowupStatus(followup.id, "failed", result.error);
        console.error(`❌ Failed to send follow-up to ${followup.email}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error processing follow-up for ${followup.email}:`, error);
      await this.updateFollowupStatus(followup.id, "failed", error.message);
    }
  }

  async safeCheckOpened(emailLogId) {
    try {
      if (databaseService.isConnected) return await databaseService.checkEmailOpened(emailLogId);
    } catch {}
    return await this.checkEmailOpenedInMemory(emailLogId);
  }

  async safeCheckClicked(emailLogId) {
    try {
      if (databaseService.isConnected) return await databaseService.checkEmailClicked(emailLogId);
    } catch {}
    return await this.checkEmailClickedInMemory(emailLogId);
  }

  async safeCheckReplied({ campaignId, email, emailLogId }) {
    try {
      if (databaseService.isConnected) {
        return await databaseService.checkEmailReplied({ campaignId, email, emailLogId });
      }
    } catch {}
    return await this.checkEmailRepliedInMemory({ campaignId, email, emailLogId });
  }

  async updateFollowupStatus(followupId, status, errorMessage = null) {
    try {
      if (databaseService.isConnected) {
        return await databaseService.updateFollowupStatus(followupId, status, errorMessage);
      }
    } catch {
      console.log("📝 Database not available, updating in-memory status");
    }
    return this.updateInMemoryFollowupStatus(followupId, status, errorMessage);
  }

  async scheduleFollowup(followupData) {
    try {
      if (databaseService.isConnected) {
        return await databaseService.scheduleFollowup(followupData);
      }
    } catch {
      console.log("📝 Database not available, scheduling in-memory follow-up");
    }
    return this.scheduleInMemoryFollowup(followupData);
  }

  // In-memory helpers
  getInMemoryPendingFollowups() {
    const now = new Date();
    return this.inMemoryFollowups.filter(
      (f) => f.status === "pending" && new Date(f.scheduledAt) <= now
    );
  }

  scheduleInMemoryFollowup(followupData) {
    const followup = {
      id: `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...followupData,
      status: "pending",
      createdAt: new Date().toISOString(),
      scheduledAt:
        followupData.scheduledAt ||
        new Date(Date.now() + followupData.delayHours * 60 * 60 * 1000).toISOString(),
    };

    this.inMemoryFollowups.push(followup);
    console.log(`📅 Scheduled in-memory follow-up for ${followup.email} at ${followup.scheduledAt}`);

    return { success: true, id: followup.id, scheduledAt: followup.scheduledAt };
  }

  updateInMemoryFollowupStatus(followupId, status, errorMessage = null) {
    const followup = this.inMemoryFollowups.find((f) => f.id === followupId);
    if (followup) {
      followup.status = status;
      followup.errorMessage = errorMessage;
      if (status === "sent") followup.sentAt = new Date().toISOString();
      console.log(`📝 Updated in-memory follow-up ${followupId} status to ${status}`);
      return true;
    }
    return false;
  }

  async checkEmailOpenedInMemory() {
    return false;
  }

  async checkEmailClickedInMemory() {
    return false;
  }

  async checkEmailRepliedInMemory() {
    return false;
  }
}

module.exports = new FollowupService();
