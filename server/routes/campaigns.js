// routes/campaign.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { getLatestEmailAccount } = require("../helpers/emailAccount");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

// helper (SELECT only)
async function q(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

function toInt(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(value) {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const s = String(value || "").trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return false;
}

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * ✅ USER-SAFE unsubscribe set (global + campaign scope)
 * returns Set of normalized emails
 */
async function getUnsubscribedSet(userId, campaignId) {
  const [rows] = await db.query(
    `SELECT LOWER(TRIM(email)) AS email
     FROM unsubscribes
     WHERE user_id = ?
       AND (scope = 'all' OR (scope = 'campaign' AND campaign_id = ?))`,
    [userId, campaignId]
  );
  return new Set(rows.map((r) => r.email));
}

/**
 * Normalize followupSettings from different possible frontend keys.
 */
function getFollowupSettings(body) {
  return body.followupSettings || body.followUpSettings || body.followup_settings || null;
}

/**
 * DB enum: ('not_opened','not_clicked','always','no_reply')
 */
function normalizeFollowupCondition(raw) {
  const v = String(raw || "").trim().toLowerCase();

  if (v === "not_opened" || v === "not_clicked" || v === "always" || v === "no_reply") return v;

  if (v.includes("not opened")) return "not_opened";
  if (v.includes("not clicked")) return "not_clicked";
  if (v.includes("always")) return "always";
  if (v.includes("no reply")) return "no_reply";

  return "not_opened";
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
      userId: userIdRaw,
      name,
      subject,
      templateId: templateIdRaw,
      template,
      leads,
      runAt,
      settings,
    } = req.body;

    const followupSettings = getFollowupSettings(req.body);

    const userId = toInt(userIdRaw);
    const templateId = templateIdRaw != null ? toInt(templateIdRaw) : null;

    if (!userId || !name || !subject || !template || !Array.isArray(leads)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    if (leads.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Leads list is empty" });
    }

    const followupEnabled = toBool(followupSettings?.enabled);
    const hasFollowup = followupEnabled ? 1 : 0;

    const followupDelayHours =
      followupEnabled && followupSettings?.delayHours != null
        ? toFloat(followupSettings.delayHours)
        : null;

    const followupTemplateId =
      followupEnabled ? (toInt(followupSettings?.templateId) || null) : null;

    const followupSubject =
      followupEnabled ? (String(followupSettings?.subject || "").trim() || null) : null;

    const followupCondition =
      followupEnabled ? normalizeFollowupCondition(followupSettings?.condition) : null;

    const delayBetweenEmails =
      settings?.delayBetweenEmails != null ? toInt(settings.delayBetweenEmails) : 200;

    const maxLevel = settings?.maxLevel != null ? toInt(settings.maxLevel) : 100;

    // ✅ Schedule now if runAt missing
    const scheduledAt = runAt ? new Date(runAt) : new Date();

    const [result] = await conn.query(
      `INSERT INTO email_campaigns
       (user_id, name, subject, content, template_id,
        status, scheduled_at, total_recipients,
        has_followup, followup_template_id,
        followup_subject, followup_delay_hours, followup_condition,
        delay_ms, max_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        subject,
        template.content || "",
        templateId || null,
        "scheduled",
        scheduledAt,
        leads.length,
        hasFollowup,
        followupTemplateId,
        followupSubject,
        followupDelayHours,
        followupCondition,
        Number.isFinite(delayBetweenEmails) ? delayBetweenEmails : 200,
        Number.isFinite(maxLevel) ? maxLevel : 100,
      ]
    );

    const campaignId = result.insertId;

    const values = leads
      .filter((l) => l && typeof l.email === "string" && l.email.trim())
      .map((l) => [
        campaignId,
        l.email.trim(),
        typeof l.name === "string" && l.name.trim() ? l.name.trim() : null,
        JSON.stringify(l),
      ]);

    if (values.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "No valid lead emails found" });
    }

    await conn.query(
      `INSERT IGNORE INTO campaign_data (campaign_id, email, name, payload) VALUES ?`,
      [values]
    );

    await conn.commit();
    return res.status(201).json({ success: true, campaignId });
  } catch (err) {
    await conn.rollback();
    console.error("Create campaign error:", err);
    return res.status(500).json({ success: false, message: err.message });
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
    const userId = toInt(req.query.userId);
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const rows = await q(
      `SELECT
          ec.id, ec.user_id, ec.name, ec.subject, ec.status,
          ec.total_recipients, ec.sent_count,
          ec.opened_count, ec.clicked_count, ec.bounced_count,
          ec.scheduled_at, ec.created_at, ec.delay_ms, ec.max_level,

          ec.has_followup, ec.followup_template_id, ec.followup_subject,
          ec.followup_delay_hours, ec.followup_condition,

          (
            SELECT COUNT(*)
            FROM unsubscribes u
            WHERE u.user_id = ec.user_id
              AND (
                u.campaign_id = ec.id
                OR (
                  u.scope = 'all'
                  AND EXISTS (
                    SELECT 1
                    FROM campaign_data cd
                    WHERE cd.campaign_id = ec.id
                      AND LOWER(TRIM(cd.email)) = LOWER(TRIM(u.email))
                  )
                )
              )
          ) AS unsubscribed_count_live

       FROM email_campaigns ec
       WHERE ec.user_id = ?
       ORDER BY ec.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        subject: r.subject,
        status: r.status,
        totalRecipients: r.total_recipients,
        sentCount: r.sent_count,
        openedCount: r.opened_count,
        clickedCount: r.clicked_count,
        bouncedCount: r.bounced_count,
        unsubscribedCount: Number(r.unsubscribed_count_live || 0),
        scheduledAt: r.scheduled_at,
        createdAt: r.created_at,
        delayMs: r.delay_ms,
        maxLevel: r.max_level,

        hasFollowup: r.has_followup,
        followupTemplateId: r.followup_template_id,
        followupSubject: r.followup_subject,
        followupDelayHours: r.followup_delay_hours,
        followupCondition: r.followup_condition,
      })),
    });
  } catch (err) {
    console.error("Get campaigns error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * UPDATE CAMPAIGN STATUS / COUNTS
 * PUT /api/campaigns/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const { status, sentCount, openedCount, clickedCount, bouncedCount, unsubscribedCount } =
      req.body;

    await db.query(
      `UPDATE email_campaigns
       SET status        = COALESCE(?, status),
           sent_count    = COALESCE(?, sent_count),
           opened_count  = COALESCE(?, opened_count),
           clicked_count = COALESCE(?, clicked_count),
           bounced_count = COALESCE(?, bounced_count),
           unsubscribed_count = COALESCE(?, unsubscribed_count),
           updated_at    = NOW()
       WHERE id = ?`,
      [status, sentCount, openedCount, clickedCount, bouncedCount, unsubscribedCount, id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Update campaign error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE CAMPAIGN
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    await db.query(`DELETE FROM email_campaigns WHERE id = ?`, [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete campaign error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET SINGLE CAMPAIGN
 */
router.get("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const rows = await q(
      `SELECT
         ec.*,
         (
           SELECT COUNT(*)
           FROM unsubscribes u
           WHERE u.user_id = ec.user_id
             AND (
               u.campaign_id = ec.id
               OR (
                 u.scope = 'all'
                 AND EXISTS (
                   SELECT 1
                   FROM campaign_data cd
                   WHERE cd.campaign_id = ec.id
                     AND LOWER(TRIM(cd.email)) = LOWER(TRIM(u.email))
                 )
               )
             )
         ) AS unsubscribed_count_live
       FROM email_campaigns ec
       WHERE ec.id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Campaign not found" });

    const c = rows[0];

    return res.json({
      success: true,
      data: {
        id: c.id,
        userId: c.user_id,
        name: c.name,
        subject: c.subject,
        content: c.content,
        templateId: c.template_id,
        status: c.status,
        totalRecipients: c.total_recipients,
        sentCount: c.sent_count,
        openedCount: c.opened_count,
        clickedCount: c.clicked_count,
        bouncedCount: c.bounced_count,
        unsubscribedCount: Number(c.unsubscribed_count_live || 0),
        scheduledAt: c.scheduled_at,
        createdAt: c.created_at,

        hasFollowup: c.has_followup,
        followupTemplateId: c.followup_template_id,
        followupSubject: c.followup_subject,
        followupDelayHours: c.followup_delay_hours,
        followupCondition: c.followup_condition,
        delayMs: c.delay_ms,
        maxLevel: c.max_level,
      },
    });
  } catch (err) {
    console.error("Get campaign by ID error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ MANUAL SEND (FULLY FIXED)
 * POST /api/campaigns/:id/send
 *
 * - Skips unsubscribed
 * - Updates campaign_data per lead:
 *   status='sent', sent_at, sent_from_email, smtp_message_id
 * - Marks skipped unsub leads as status='unsubscribed'
 */
router.post("/:id/send", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const campaignId = toInt(req.params.id);
    if (!campaignId) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const [[campaign]] = await conn.query(`SELECT * FROM email_campaigns WHERE id = ?`, [campaignId]);
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });

    const userId = toInt(campaign.user_id);
    if (!userId) return res.status(400).json({ success: false, message: "Campaign has invalid user_id" });

    const [leads] = await conn.query(
      `SELECT id, email, name
       FROM campaign_data
       WHERE campaign_id = ?`,
      [campaignId]
    );
    if (!leads.length) return res.status(400).json({ success: false, message: "No leads found for this campaign" });

    const emailAccount = await getLatestEmailAccount(userId);
    const transporter = createTransporter(emailAccount);

    const unsubSet = await getUnsubscribedSet(userId, campaignId);

    const baseUrl = process.env.APP_URL || "http://localhost:3001";

    await conn.query(`UPDATE email_campaigns SET status = 'sending' WHERE id = ?`, [campaignId]);

    let sentCount = 0;
    let skippedUnsub = 0;

    for (const lead of leads) {
      if (!lead?.email) continue;

      const emailNorm = normEmail(lead.email);

      // ✅ Skip unsubscribed + mark row
      if (unsubSet.has(emailNorm)) {
        skippedUnsub++;
        await conn.query(
          `UPDATE campaign_data
           SET status = 'unsubscribed'
           WHERE id = ?`,
          [lead.id]
        );
        continue;
      }

      const token = sign({
        email: emailNorm,
        userId,
        campaignId,
        scope: "all",
        exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
      });

      const unsubUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;

      const info = await transporter.sendMail({
        from: `"${emailAccount.from_name || "Campaign"}" <${emailAccount.email}>`,
        to: lead.email,
        subject: campaign.subject,
        html: `
          <div style="width:100%;text-align:right;font-size:12px;margin-bottom:16px;">
            <a href="${unsubUrl}"
               style="color:#6e6e73;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              Unsubscribe
            </a>
          </div>
          ${campaign.content}
        `,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      const smtpMessageId = info?.messageId || null;

      // ✅ Mark lead sent properly (needed for follow-up + reply detection)
      await conn.query(
        `UPDATE campaign_data
         SET status = 'sent',
             sent_at = NOW(),
             sent_from_email = ?,
             smtp_message_id = ?
         WHERE id = ?`,
        [emailAccount.email, smtpMessageId, lead.id]
      );

      sentCount++;
    }

    await conn.query(
      `UPDATE email_campaigns
       SET status = 'sent',
           sent_count = ?
       WHERE id = ?`,
      [sentCount, campaignId]
    );

    return res.json({ success: true, sentCount, skippedUnsub });
  } catch (err) {
    console.error("❌ SEND CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
