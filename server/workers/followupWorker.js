// server/workers/followupWorker.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");
const { getCurrentISTMysqlDatetime } = require("../helpers/time");

const MAX_PER_TICK = 20;
const DELAY_MS = 300;

// ─── Eligible followup targets fetch karo followup_queue se ──────────────────
async function fetchFollowupTargets(limit = MAX_PER_TICK) {
  const nowIST = getCurrentISTMysqlDatetime();
  const [rows] = await db.query(
    `SELECT
       fq.id                    AS fq_id,
       fq.campaign_id,
       fq.user_id,
       fq.email,
       fq.followup_template_id,
       fq.followup_subject,
       fq.scheduled_at,
       fq.condition             AS followup_condition,
       fq.followup_order,

       ft.content               AS followup_body_html,
       ft.subject               AS template_subject,

       ec.subject               AS original_subject,

       cd.name                  AS lead_name,
       cd.payload               AS lead_payload,
       cd.opened_at,
       cd.clicked_at,
       cd.replied_at,
       cd.sent_from_email,
       cd.smtp_message_id,

       uea.from_name,
       uea.from_email,
       uea.smtp_host,
       uea.smtp_port,
       uea.smtp_security,
       uea.smtp_username        AS smtp_user,
       uea.smtp_password        AS app_password,
       uea.signature

     FROM followup_queue fq

     JOIN email_templates ft
       ON ft.id = fq.followup_template_id

     JOIN email_campaigns ec
       ON ec.id = fq.campaign_id

     -- Lead ka latest record (same campaign + email)
     LEFT JOIN campaign_data cd
       ON cd.campaign_id = fq.campaign_id
      AND LOWER(TRIM(cd.email)) = LOWER(TRIM(fq.email))

     -- Sender account
     LEFT JOIN user_email_accounts uea
       ON uea.user_id = fq.user_id
      AND (
            cd.sent_from_email IS NULL
            OR uea.from_email = cd.sent_from_email
          )

     -- Unsubscribe guard
     LEFT JOIN unsubscribes u
       ON u.user_id = fq.user_id
      AND LOWER(TRIM(u.email)) = LOWER(TRIM(fq.email))
      AND (
            u.scope = 'all'
            OR (u.scope = 'campaign' AND u.campaign_id = fq.campaign_id)
          )

     WHERE fq.status = 'pending'
       AND fq.scheduled_at <= ?
       AND u.id IS NULL
       AND uea.id IS NOT NULL

     ORDER BY fq.scheduled_at ASC, fq.followup_order ASC
     LIMIT ?`,
    [nowIST, limit]
  );

  // Condition filter
  return rows.filter((row) => {
    const cond = row.followup_condition || "always";
    if (cond === "always")      return true;
    if (cond === "not_opened")  return row.opened_at  === null;
    if (cond === "not_clicked") return row.clicked_at === null;
    if (cond === "no_reply")    return row.replied_at === null;
    return true;
  });
}

// ─── Row claim karo (duplicate send prevent) ──────────────────────────────────
async function claimFollowup(fqId) {
  const [res] = await db.query(
    `UPDATE followup_queue SET status = 'sent' WHERE id = ? AND status = 'pending'`,
    [fqId]
  );
  return res.affectedRows === 1;
}

async function markFailed(fqId, errMsg) {
  await db.query(
    `UPDATE followup_queue
     SET status = 'failed', error_message = ?, updated_at = NOW()
     WHERE id = ?`,
    [errMsg?.substring(0, 500), fqId]
  );
}

// ─── Placeholder merge ────────────────────────────────────────────────────────
function mergePlaceholders(content, lead, signature = "") {
  let out = content || "";
  const name  = lead.name  || lead.lead_name  || "";
  const email = lead.email || "";

  let payload = {};
  try {
    payload = lead.lead_payload
      ? typeof lead.lead_payload === "string"
        ? JSON.parse(lead.lead_payload)
        : lead.lead_payload
      : {};
  } catch { payload = {}; }

  const sigHtml = signature ? String(signature).replace(/\n/g, "<br>") : "";
  const fields = { name, Name: name, email, Email: email, Signature: sigHtml, signature: sigHtml, ...payload };

  for (const [key, value] of Object.entries(fields)) {
    const safe = String(value ?? "");
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
    out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`,       "gi"), safe);
  }
  return out;
}

// ─── Ek followup send karo ────────────────────────────────────────────────────
async function sendOneFollowup(row) {
  const baseUrl = process.env.APP_URL || "http://localhost:3001";

  const subject = (row.followup_subject || row.template_subject || `Re: ${row.original_subject || ""}`).trim() || "Re:";

  const account = {
    from_name:    row.from_name,
    email:        row.from_email,
    smtp_user:    row.smtp_user,
    app_password: row.app_password,
    smtp_host:    row.smtp_host,
    smtp_port:    row.smtp_port,
    smtp_security: row.smtp_security,
  };

  let htmlBody = mergePlaceholders(
    row.followup_body_html || `<p>Hi${row.lead_name ? " " + row.lead_name : ""}, just following up on my previous email.</p>`,
    row,
    row.signature || ""
  );

  // Tracking pixel
  htmlBody += `<img src="${baseUrl}/api/track/open?cid=${row.campaign_id}&email=${encodeURIComponent(row.email)}&t=${Date.now()}" width="1" height="1" style="display:none" />`;

  // Unsubscribe link
  const token = sign({
    email:      row.email.trim().toLowerCase(),
    userId:     row.user_id,
    campaignId: row.campaign_id,
    scope:      "all",
    exp:        Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  htmlBody += `
    <hr/>
    <p style="font-size:12px;color:#666;font-family:sans-serif;">
      Don't want these emails? <a href="${baseUrl}/unsubscribe?token=${token}">Unsubscribe</a>
    </p>`;

  const extraHeaders = {};
  if (row.smtp_message_id) {
    extraHeaders["In-Reply-To"] = row.smtp_message_id;
    extraHeaders["References"]  = row.smtp_message_id;
  }

  const transporter = createTransporter(account);

  await transporter.sendMail({
    from:    `"${account.from_name || "Campaign"}" <${account.email}>`,
    to:      row.email,
    subject,
    html:    htmlBody,
    headers: extraHeaders,
  });

  console.log(`✅ Followup #${row.followup_order} sent → ${row.email} [campaign_id=${row.campaign_id}]`);
}

// ─── Main tick ────────────────────────────────────────────────────────────────
async function runFollowups() {
  try {
    const targets = await fetchFollowupTargets(MAX_PER_TICK);

    if (!targets.length) {
      console.log("📭 Followup Worker: no eligible targets");
      return;
    }

    console.log(`📬 Followup Worker: ${targets.length} followup(s) to send`);

    for (const row of targets) {
      try {
        const claimed = await claimFollowup(row.fq_id);
        if (!claimed) {
          console.log(`⚠️ Already claimed: fq.id=${row.fq_id}`);
          continue;
        }

        await sendOneFollowup(row);

        await db.query(
          `UPDATE followup_queue SET sent_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [row.fq_id]
        );

      } catch (e) {
        console.error(`❌ Followup failed (fq.id=${row.fq_id}, ${row.email}):`, e.message);
        try { await markFailed(row.fq_id, e.message); } catch (_) {}
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  } catch (e) {
    console.error("❌ Followup worker tick error:", e.message);
  }
}

// ─── Cron — every minute ──────────────────────────────────────────────────────
cron.schedule("* * * * *", async () => {
  await runFollowups();
});

console.log("🔁 Followup Worker started (every 1 min)");
module.exports = { runFollowups };
