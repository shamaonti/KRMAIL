const express = require("express");
const router = express.Router();
const db = require("../db");
const { getLatestEmailAccount } = require("../helpers/emailAccount");
const { createTransporter } = require("../helpers/mailer");

// helper (SELECT only)
async function q(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * CREATE CAMPAIGN
 * POST /api/campaigns
 */
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      userId,
      name,
      subject,
      templateId,
      template,
      leads,
      followupSettings,
      runAt,
    } = req.body;

    if (!userId || !name || !subject || !template || !Array.isArray(leads)) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const hasFollowup = followupSettings ? 1 : 0;

    // ✅ FIX: runAt frontend se IST mein aata hai
    // DB ka NOW() bhi IST mein hai — isliye direct store karo, convert mat karo
    const [result] = await conn.query(
      `INSERT INTO email_campaigns
       (user_id, name, subject, content, template_id,
        status, scheduled_at, total_recipients,
        has_followup, followup_template_id,
        followup_subject, followup_delay_hours, followup_condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        subject,
        template.content || "",
        templateId || null,
        runAt ? "scheduled" : "draft",
        runAt || null,                    // frontend ka time as-is store karo
        leads.length,
        hasFollowup,
        followupSettings?.templateId || null,
        followupSettings?.subject     || null,
        followupSettings?.delayHours  || 24,
        followupSettings?.condition   || "not_opened",
      ]
    );

    const campaignId = result.insertId;

    // Insert leads
    const values = leads.map((l) => [
      campaignId,
      l.email,
      l.name || null,
      JSON.stringify(l),
    ]);

    await conn.query(
      `INSERT IGNORE INTO campaign_data (campaign_id, email, name, payload) VALUES ?`,
      [values]
    );

    await conn.commit();

    res.status(201).json({ success: true, campaignId });

  } catch (err) {
    await conn.rollback();
    console.error("Create campaign error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET ALL CAMPAIGNS
 * GET /api/campaigns?userId=1
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const rows = await q(
      `SELECT id, user_id, name, subject, status,
              total_recipients, sent_count,
              opened_count, clicked_count, bounced_count,
              scheduled_at, created_at
       FROM email_campaigns
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        id:               r.id,
        userId:           r.user_id,
        name:             r.name,
        subject:          r.subject,
        status:           r.status,
        totalRecipients:  r.total_recipients,
        sentCount:        r.sent_count,
        openedCount:      r.opened_count,
        clickedCount:     r.clicked_count,
        bouncedCount:     r.bounced_count,
        scheduledAt:      r.scheduled_at,
        createdAt:        r.created_at,
      })),
    });

  } catch (err) {
    console.error("Get campaigns error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * UPDATE CAMPAIGN STATUS / COUNTS
 * PUT /api/campaigns/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sentCount, openedCount, clickedCount, bouncedCount } = req.body;

    await db.query(
      `UPDATE email_campaigns
       SET status        = COALESCE(?, status),
           sent_count    = COALESCE(?, sent_count),
           opened_count  = COALESCE(?, opened_count),
           clicked_count = COALESCE(?, clicked_count),
           bounced_count = COALESCE(?, bounced_count),
           updated_at    = NOW()
       WHERE id = ?`,
      [status, sentCount, openedCount, clickedCount, bouncedCount, id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Update campaign error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE CAMPAIGN
 */
router.delete("/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM email_campaigns WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete campaign error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET SINGLE CAMPAIGN BY ID
 * GET /api/campaigns/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await q(
      `SELECT
         id, user_id, name, subject, content, template_id,
         status, total_recipients, sent_count, opened_count,
         clicked_count, bounced_count, scheduled_at, created_at,
         has_followup, followup_template_id, followup_subject,
         followup_delay_hours, followup_condition
       FROM email_campaigns
       WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const c = rows[0];
    res.json({
      success: true,
      data: {
        id:                  c.id,
        userId:              c.user_id,
        name:                c.name,
        subject:             c.subject,
        content:             c.content,
        templateId:          c.template_id,
        status:              c.status,
        totalRecipients:     c.total_recipients,
        sentCount:           c.sent_count,
        openedCount:         c.opened_count,
        clickedCount:        c.clicked_count,
        bouncedCount:        c.bounced_count,
        scheduledAt:         c.scheduled_at,
        createdAt:           c.created_at,
        hasFollowup:         c.has_followup,
        followupTemplateId:  c.followup_template_id,
        followupSubject:     c.followup_subject,
        followupDelayHours:  c.followup_delay_hours,
        followupCondition:   c.followup_condition,
      },
    });

  } catch (err) {
    console.error("Get campaign by ID error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * SEND CAMPAIGN EMAILS (REAL SMTP)
 * POST /api/campaigns/:id/send
 */
router.post("/:id/send", async (req, res) => {
  const conn = await db.getConnection();

  try {
    const campaignId = Number(req.params.id); // ✅ FIX: id → campaignId (ek jagah se)

    if (!Number.isInteger(campaignId)) {
      return res.status(400).json({ success: false, message: "Invalid campaign ID" });
    }

    console.log("➡️ SEND route hit:", campaignId);

    const [campaignRows] = await conn.query(
      `SELECT * FROM email_campaigns WHERE id = ?`,
      [campaignId]
    );

    if (!campaignRows.length) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const campaign = campaignRows[0];

    // ✅ FIX: `id` ki jagah `campaignId` use karo
    const [leads] = await conn.query(
      `SELECT email, name FROM campaign_data WHERE campaign_id = ?`,
      [campaignId]
    );

    const emailAccount = await getLatestEmailAccount(conn, campaign.user_id);
    console.log("📧 SMTP account:", emailAccount.email);

    const transporter = createTransporter(emailAccount);

    // ✅ FIX: `id` ki jagah `campaignId`
    await conn.query(
      `UPDATE email_campaigns SET status = 'sending' WHERE id = ?`,
      [campaignId]
    );

    let sentCount = 0;

    for (const lead of leads) {
      await transporter.sendMail({
        from: `"${emailAccount.from_name || "Campaign"}" <${emailAccount.email}>`,
        to:      lead.email,
        subject: campaign.subject,
        html:    campaign.content,
      });
      sentCount++;
    }

    // ✅ FIX: `id` ki jagah `campaignId`
    await conn.query(
      `UPDATE email_campaigns SET status = 'sent', sent_count = ? WHERE id = ?`,
      [sentCount, campaignId]
    );

    res.json({ success: true, sentCount });

  } catch (err) {
    console.error("❌ SEND CAMPAIGN ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;