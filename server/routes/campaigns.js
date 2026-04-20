// routes/campaign.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { getLatestEmailAccount } = require("../helpers/emailAccount");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");
const {
  getISTMysqlDatetimeAfterHours,
  normalizeToISTMysqlDatetime,
} = require("../helpers/time");

// helper (SELECT only)
async function q(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * ✅ Convert MySQL DATETIME (JS Date object) to plain string "YYYY-MM-DD HH:MM:SS"
 */
function toISTString(dt) {
  if (!dt) return null;

  const pad = (n) => String(n).padStart(2, "0");

  if (dt instanceof Date) {
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ` +
           `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  }

  const s = String(dt).trim();
  return s.replace("T", " ").replace(/\.\d+Z?$/, "");
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

function extractName(lead) {
  if (!lead || typeof lead !== "object") return null;
  if (typeof lead.name === "string" && lead.name.trim()) return lead.name.trim();
  const keys = Object.keys(lead);
  const nameKey = keys.find(k => k.toLowerCase() === "name");
  if (nameKey && typeof lead[nameKey] === "string" && lead[nameKey].trim()) {
    return lead[nameKey].trim();
  }
  const firstKey = keys.find(k => k.toLowerCase() === "firstname" || k.toLowerCase() === "first_name");
  const lastKey  = keys.find(k => k.toLowerCase() === "lastname"  || k.toLowerCase() === "last_name");
  const first = firstKey ? String(lead[firstKey] || "").trim() : "";
  const last  = lastKey  ? String(lead[lastKey]  || "").trim() : "";
  const full  = `${first} ${last}`.trim();
  if (full) return full;
  return null;
}

function extractEmail(lead) {
  if (!lead || typeof lead !== "object") return null;
  if (typeof lead.email === "string" && lead.email.trim()) return lead.email.trim();
  const keys = Object.keys(lead);
  const emailKey = keys.find(k => k.toLowerCase() === "email");
  if (emailKey && typeof lead[emailKey] === "string" && lead[emailKey].trim()) {
    return lead[emailKey].trim();
  }
  return null;
}

function getFollowupSettings(body) {
  return body.followupSettings || body.followUpSettings || body.followup_settings || null;
}

function normalizeFollowupCondition(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "not_opened" || v === "not_clicked" || v === "always" || v === "no_reply") return v;
  if (v.includes("not opened"))  return "not_opened";
  if (v.includes("not clicked")) return "not_clicked";
  if (v.includes("always"))      return "always";
  if (v.includes("no reply"))    return "no_reply";
  return "not_opened";
}

function mergePlaceholders(content, lead, payload = {}, signature = "") {
  let out = content;

  const name  = lead.name  || payload.name  || payload.Name  || "";
  const email = lead.email || payload.email || payload.Email || "";
  const sigHtml = signature ? String(signature).replace(/\n/g, "<br>") : "";

  const allFields = {
    name,  Name: name,
    email, Email: email,
    Signature: sigHtml,
    signature: sigHtml,
  };

  for (const [k, v] of Object.entries(payload)) {
    allFields[k] = String(v || "");
  }

  for (const [key, value] of Object.entries(allFields)) {
    const safe = String(value || "");
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
    out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`,       "gi"), safe);
  }

  return out;
}

function parseRunAt(runAt) {
  return normalizeToISTMysqlDatetime(runAt);
}

// ─────────────────────────────────────────────────────────────────────────────
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
      templateId: templateIdRaw,
      template,
      leads,
      runAt,
      settings,
    } = req.body;

    const followupSettings = getFollowupSettings(req.body);
    const inboxAccountId   = req.body.inboxAccountId || null;

    const userId     = toInt(userIdRaw);
    const templateId = templateIdRaw != null ? toInt(templateIdRaw) : null;

    const subject = String(req.body.subject || template?.subject || "").trim();

    if (!userId || !name || !subject || !template || !Array.isArray(leads)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    if (leads.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Leads list is empty" });
    }

    const followupEnabled    = toBool(followupSettings?.enabled);
    const hasFollowup        = followupEnabled ? 1 : 0;
    const followupDelayHours = followupEnabled && followupSettings?.delayHours != null
      ? toFloat(followupSettings.delayHours) : null;
    const followupTemplateId = followupEnabled ? (toInt(followupSettings?.templateId) || null) : null;
    const followupSubject    = followupEnabled
      ? String(followupSettings?.template?.subject || followupSettings?.subject || "").trim() || null
      : null;
    const followupCondition  = followupEnabled
      ? normalizeFollowupCondition(followupSettings?.condition) : null;

    const delayBetweenEmails = settings?.delayBetweenEmails != null ? toInt(settings.delayBetweenEmails) : 200;
    const maxLevel           = settings?.maxLevel != null ? toInt(settings.maxLevel) : 100;
    const timezone           = settings?.timezone || "IST";

    const scheduledAt    = parseRunAt(runAt);
    const campaignStatus = scheduledAt ? "scheduled" : "draft";

    const [result] = await conn.query(
      `INSERT INTO email_campaigns
        (user_id, name, subject, content, template_id,
         status, scheduled_at, total_recipients,
         has_followup, followup_template_id,
         followup_subject, followup_delay_hours, followup_condition,
         delay_ms, max_level, time_zone, inbox_account_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        subject,
        template.content || "",
        templateId || null,
        campaignStatus,
        scheduledAt,
        leads.length,
        hasFollowup,
        followupTemplateId,
        followupSubject,
        followupDelayHours,
        followupCondition,
        Number.isFinite(delayBetweenEmails) ? delayBetweenEmails : 200,
        Number.isFinite(maxLevel)           ? maxLevel           : 100,
        timezone,
        inboxAccountId,
      ]
    );

    const campaignId = result.insertId;

    const values = leads
      .filter(l => { const e = extractEmail(l); return e && e.trim(); })
      .map(l => [campaignId, extractEmail(l).trim(), extractName(l), JSON.stringify(l)]);

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

// ─────────────────────────────────────────────────────────────────────────────
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
            FROM campaign_data cd
            WHERE cd.campaign_id = ec.id AND cd.status = 'unsubscribed'
          ) AS unsubscribed_count_live
       FROM email_campaigns ec
       WHERE ec.user_id = ?
       ORDER BY ec.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: rows.map(r => ({
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
        unsubscribedCount: Number(r.unsubscribed_count_live || 0),
        scheduledAt:      toISTString(r.scheduled_at),
        createdAt:        toISTString(r.created_at),
        delayMs:          r.delay_ms,
        maxLevel:         r.max_level,
        hasFollowup:         r.has_followup,
        followupTemplateId:  r.followup_template_id,
        followupSubject:     r.followup_subject,
        followupDelayHours:  r.followup_delay_hours,
        followupCondition:   r.followup_condition,
      })),
    });
  } catch (err) {
    console.error("Get campaigns error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * UPDATE CAMPAIGN STATUS / COUNTS
 * PUT /api/campaigns/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const { status, sentCount, openedCount, clickedCount, bouncedCount, unsubscribedCount } = req.body;

    await db.query(
      `UPDATE email_campaigns
       SET status             = COALESCE(?, status),
           sent_count         = COALESCE(?, sent_count),
           opened_count       = COALESCE(?, opened_count),
           clicked_count      = COALESCE(?, clicked_count),
           bounced_count      = COALESCE(?, bounced_count),
           unsubscribed_count = COALESCE(?, unsubscribed_count),
           updated_at         = NOW()
       WHERE id = ?`,
      [status, sentCount, openedCount, clickedCount, bouncedCount, unsubscribedCount, id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Update campaign error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET SINGLE CAMPAIGN
 */
router.get("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const rows = await q(
      `SELECT ec.*,
         (
           SELECT COUNT(*)
           FROM campaign_data cd
           WHERE cd.campaign_id = ec.id AND cd.status = 'unsubscribed'
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
        id:               c.id,
        userId:           c.user_id,
        name:             c.name,
        subject:          c.subject,
        content:          c.content,
        templateId:       c.template_id,
        status:           c.status,
        totalRecipients:  c.total_recipients,
        sentCount:        c.sent_count,
        openedCount:      c.opened_count,
        clickedCount:     c.clicked_count,
        bouncedCount:     c.bounced_count,
        unsubscribedCount: Number(c.unsubscribed_count_live || 0),
        scheduledAt:      toISTString(c.scheduled_at),
        createdAt:        toISTString(c.created_at),
        hasFollowup:         c.has_followup,
        followupTemplateId:  c.followup_template_id,
        followupSubject:     c.followup_subject,
        followupDelayHours:  c.followup_delay_hours,
        followupCondition:   c.followup_condition,
        delayMs:          c.delay_ms,
        maxLevel:         c.max_level,
      },
    });
  } catch (err) {
    console.error("Get campaign by ID error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * MANUAL SEND
 * POST /api/campaigns/:id/send
 */
router.post("/:id/send", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const campaignId = toInt(req.params.id);
    if (!campaignId) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const [[campaign]] = await conn.query(
      `SELECT * FROM email_campaigns WHERE id = ?`, [campaignId]
    );
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });

    const userId = toInt(campaign.user_id);
    if (!userId) return res.status(400).json({ success: false, message: "Campaign has invalid user_id" });

    const [[templateRow]] = await conn.query(
      `SELECT subject, content FROM email_templates WHERE id = ?`,
      [campaign.template_id]
    );

    if (!templateRow || !templateRow.content) {
      return res.status(400).json({ success: false, message: "Template not found or has no content" });
    }

    const templateContent = templateRow.content;
    const emailSubject    = String(templateRow.subject?.trim() || campaign.subject || "");

    await conn.query(
      `UPDATE campaign_data cd
       JOIN unsubscribes u
         ON LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))
        AND u.user_id = ?
        AND (
              u.scope = 'all'
              OR (u.scope = 'campaign' AND CAST(u.campaign_id AS UNSIGNED) = CAST(cd.campaign_id AS UNSIGNED))
            )
       SET cd.status = 'unsubscribed'
       WHERE cd.campaign_id = ? AND cd.status = 'pending'`,
      [userId, campaignId]
    );

    const [leads] = await conn.query(
      `SELECT id, email, name, payload FROM campaign_data WHERE campaign_id = ? AND status = 'pending'`,
      [campaignId]
    );

    if (!leads.length) {
      const [unsubResult] = await conn.query(
        `SELECT COUNT(*) as cnt FROM campaign_data WHERE campaign_id = ? AND status = 'unsubscribed'`,
        [campaignId]
      );
      const unsubCount = Number(unsubResult[0]?.cnt || 0);
      await conn.query(
        `UPDATE email_campaigns SET status = 'sent', sent_count = 0, unsubscribed_count = ? WHERE id = ?`,
        [unsubCount, campaignId]
      );
      return res.json({ success: true, sentCount: 0, skippedUnsub: unsubCount });
    }

    const inboxIds = (req.body.inboxAccountId || campaign.inbox_account_id || '')
      .split(',').map(Number).filter(Boolean);

    const [emailAccounts] = await conn.query(
      `SELECT
         id, from_name,
         from_email    AS email,
         smtp_username AS smtp_user,
         smtp_password AS app_password,
         smtp_host, smtp_port, smtp_security,
         signature, daily_limit
       FROM user_email_accounts
       WHERE user_id = ?
       ${inboxIds.length > 0 ? `AND id IN (${inboxIds.map(() => '?').join(',')})` : ''}
       ORDER BY id DESC`,
      inboxIds.length > 0 ? [userId, ...inboxIds] : [userId]
    );

    if (!emailAccounts.length) {
      return res.status(400).json({ success: false, message: "No email account configured for this user" });
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3001";

    await conn.query(
      `UPDATE email_campaigns SET status = 'sending', subject = ? WHERE id = ?`,
      [emailSubject, campaignId]
    );

    // ✅ Followup steps ek baar fetch karo — leads loop se PEHLE
    let followupSteps = [];
    if (campaign.has_followup && campaign.template_id) {
      [followupSteps] = await conn.query(
        `SELECT id, followup_order, delay_days, send_condition, subject
         FROM email_templates
         WHERE parent_template_id = ?
         ORDER BY followup_order ASC`,
        [campaign.template_id]
      );
      console.log(`📋 ${followupSteps.length} followup step(s) found for template ${campaign.template_id}`);
    }

    let sentCount    = 0;
    let accountIndex = 0;

   for (const lead of leads) {
      if (!lead?.email) continue;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lead.email.trim())) {
        await conn.query(
          `INSERT IGNORE INTO unsubscribes (email, user_id, campaign_id, scope, reason)
           VALUES (?, ?, ?, 'campaign', 'invalid email')`,
          [lead.email.trim(), userId, campaignId]
        );
        await conn.query(
          `UPDATE campaign_data SET status = 'bounced' WHERE id = ?`,
          [lead.id]
        );
        console.log(`⚠️ Invalid email skipped: ${lead.email}`);
        continue;
      }

      const emailAccount = emailAccounts[accountIndex % emailAccounts.length];
      accountIndex++;
      const transporter = createTransporter(emailAccount);
      const emailNorm   = normEmail(lead.email);

      let payloadObj = {};
      try {
        payloadObj = lead.payload
          ? typeof lead.payload === "string" ? JSON.parse(lead.payload) : lead.payload
          : {};
      } catch (_) { payloadObj = {}; }

      let emailContent = mergePlaceholders(
        templateContent, lead, payloadObj, emailAccount.signature || ""
      );

      emailContent += `<img src="${baseUrl}/api/track/open?cid=${campaignId}&email=${encodeURIComponent(lead.email)}&t=${Date.now()}" width="1" height="1" style="display:none" />`;

      const token = sign({
        email: emailNorm, userId, campaignId, scope: "all",
        exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
      });
      const unsubUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;

      emailContent += `
        <hr/>
        <p style="font-size:12px;color:#666;font-family:sans-serif;">
          Don't want these emails? <a href="${unsubUrl}">Unsubscribe</a>
        </p>`;

      let info;
      try {
        info = await transporter.sendMail({
          from:    `"${emailAccount.from_name || "Campaign"}" <${emailAccount.email}>`,
          to:      lead.email,
          subject: emailSubject,
          html:    emailContent,
          headers: {
            "List-Unsubscribe":      `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
      } catch (smtpErr) {
        await conn.query(
          `INSERT IGNORE INTO unsubscribes (email, user_id, campaign_id, scope, reason)
           VALUES (?, ?, ?, 'campaign', 'bounced - domain not found')`,
          [lead.email.trim(), userId, campaignId]
        );
        await conn.query(
          `UPDATE campaign_data SET status = 'bounced' WHERE id = ?`,
          [lead.id]
        );
        console.log(`⚠️ Bounced (SMTP failed): ${lead.email}`);
        continue;
      }

      const smtpMessageId = info?.messageId || null;

      await conn.query(
        `UPDATE campaign_data
         SET status = 'sent', sent_at = NOW(), sent_from_email = ?, smtp_message_id = ?
         WHERE id = ? AND status = 'pending'`,
        [emailAccount.email, smtpMessageId, lead.id]
      );
      sentCount++;

      // ✅ Har lead ke liye saare followup steps queue mein daalo
      if (followupSteps.length > 0) {
        try {
          for (const step of followupSteps) {
            const delayHours     = (step.delay_days || 1) * 24;
            const scheduledAtStr = getISTMysqlDatetimeAfterHours(delayHours);

            await conn.query(
              `INSERT INTO followup_queue
                 (campaign_id, user_id, email, followup_template_id, followup_subject,
                  scheduled_at, \`condition\`, followup_order, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
              [
                campaignId, userId, lead.email,
                step.id,
                step.subject || emailSubject,
                scheduledAtStr,
                step.send_condition || 'not_opened',
                step.followup_order || 1,
              ]
            );
            console.log(`📅 Followup #${step.followup_order} queued → ${lead.email} at ${scheduledAtStr}`);
          }
        } catch (fErr) {
          console.error(`⚠️ Followup queue failed for ${lead.email}:`, fErr.message);
        }
      }
    }

 const [unsubResult] = await conn.query(
      `SELECT COUNT(*) as cnt FROM campaign_data WHERE campaign_id = ? AND status = 'unsubscribed'`,
      [campaignId]
    );
    const finalUnsubCount = Number(unsubResult[0]?.cnt || 0);

    // ✅ Count bounced
    const [bouncedResult] = await conn.query(
      `SELECT COUNT(*) as cnt FROM campaign_data WHERE campaign_id = ? AND status = 'bounced'`,
      [campaignId]
    );
    const finalBouncedCount = Number(bouncedResult[0]?.cnt || 0);

    await conn.query(
      `UPDATE email_campaigns SET status = 'sent', sent_count = ?, unsubscribed_count = ?, bounced_count = ? WHERE id = ?`,
      [sentCount, finalUnsubCount, finalBouncedCount, campaignId]
    );

    return res.json({ success: true, sentCount, skippedUnsub: finalUnsubCount });

  } catch (err) {
    console.error("❌ SEND CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});
router.get("/:id/followup-stats", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    // ✅ Each followup step separately with its name
    const rows = await q(
      `SELECT
         followup_order,
         followup_subject,
         COUNT(*)                AS total,
         SUM(status = 'sent')    AS sent,
         SUM(status = 'pending') AS pending,
         SUM(status = 'failed')  AS failed
       FROM followup_queue
       WHERE campaign_id = ?
       GROUP BY followup_order, followup_subject
       ORDER BY followup_order ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: rows.map(r => ({
        followup_order:   Number(r.followup_order),
        followup_subject: r.followup_subject || `Followup #${r.followup_order}`,
        total:   Number(r.total   || 0),
        sent:    Number(r.sent    || 0),
        pending: Number(r.pending || 0),
        failed:  Number(r.failed  || 0),
      }))
    });

  } catch (err) {
    console.error("Followup stats error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/:id/followup-details", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid campaign ID" });

    const rows = await q(
      `SELECT followup_order, email, followup_subject, status, scheduled_at, sent_at, error_message
       FROM followup_queue
       WHERE campaign_id = ?
       ORDER BY followup_order ASC, id ASC`,
      [id]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
// ✅ PAUSE
router.post("/:id/pause", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid ID" });
    await db.query(
      `UPDATE email_campaigns SET status = 'paused', updated_at = NOW()
       WHERE id = ? AND status IN ('scheduled', 'sending')`, [id]
    );
    return res.json({ success: true, message: "Campaign paused" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ RESUME
router.post("/:id/resume", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid ID" });
    await db.query(
      `UPDATE email_campaigns SET status = 'scheduled', updated_at = NOW()
       WHERE id = ? AND status = 'paused'`, [id]
    );
    return res.json({ success: true, message: "Campaign resumed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ STOP permanently
router.post("/:id/stop", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid ID" });
    await db.query(
      `UPDATE email_campaigns SET status = 'stopped', updated_at = NOW()
       WHERE id = ? AND status IN ('scheduled', 'sending', 'paused')`, [id]
    );
    return res.json({ success: true, message: "Campaign stopped" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
