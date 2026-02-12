// server/workers/followupWorker.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

// ---- CONFIG ----
const RUN_EVERY_MINUTE = true;
const MAX_PER_TICK     = 20;
const DELAY_MS         = 300;

// ─────────────────────────────────────────────
//  FETCH ELIGIBLE FOLLOW-UP TARGETS
// ─────────────────────────────────────────────
async function fetchFollowupTargets(limit = MAX_PER_TICK) {
  const [rows] = await db.query(
    `
    SELECT
      cd.id                                AS id,
      ec.user_id                           AS user_id,
      cd.campaign_id                       AS campaign_id,
      cd.email                             AS email,
      cd.name                              AS name,
      cd.payload                           AS payload,
      cd.sent_from_email                   AS sent_from_email,
      cd.smtp_message_id                   AS smtp_message_id,
      cd.sent_at                           AS sent_at,
      cd.opened_at                         AS opened_at,
      cd.clicked_at                        AS clicked_at,

      ec.subject                           AS original_subject,
      ec.followup_condition                AS followup_condition,

      ft.subject                           AS followup_subject,
      ft.content                           AS followup_body_html,

      ec.followup_delay_hours              AS followup_delay_hours,

      uea.from_name                        AS from_name,
      uea.from_email                       AS from_email,
      uea.smtp_host                        AS smtp_host,
      uea.smtp_port                        AS smtp_port,
      uea.smtp_security                    AS smtp_security,
      uea.smtp_username                    AS smtp_user,
      uea.smtp_password                    AS app_password

    FROM campaign_data cd

    JOIN email_campaigns ec
      ON ec.id           = cd.campaign_id
     AND ec.has_followup  = 1
     AND ec.followup_template_id IS NOT NULL
     AND ec.followup_delay_hours IS NOT NULL   -- ✅ NULL guard: user ne time set kiya ho

    JOIN email_templates ft
      ON ft.id      = ec.followup_template_id
     AND ft.user_id = ec.user_id

    JOIN user_email_accounts uea
      ON uea.user_id    = ec.user_id
     AND uea.from_email = cd.sent_from_email

    LEFT JOIN unsubscribes u
      ON u.user_id = ec.user_id
     AND LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))

    WHERE cd.status         = 'sent'
      AND cd.follow_up_sent  = 0
      AND cd.replied_at      IS NULL
      AND cd.sent_at         IS NOT NULL

      -- ✅ Delay check: user ka exact time respect karo
      AND cd.sent_at <= DATE_SUB(NOW(), INTERVAL ec.followup_delay_hours HOUR)

      -- ✅ Unsubscribe guard
      AND u.id IS NULL

    ORDER BY cd.sent_at ASC
    LIMIT ?
    `,
    [limit]
  );

  // ✅ followup_condition filter — 'not_opened', 'not_clicked', 'always'
  return rows.filter(row => {
    const condition = row.followup_condition || "always";
    if (condition === "always")      return true;
    if (condition === "not_opened")  return row.opened_at  === null;
    if (condition === "not_clicked") return row.clicked_at === null;
    return true;
  });
}

// ─────────────────────────────────────────────
//  MARK FOLLOW-UP SENT
// ─────────────────────────────────────────────
async function markFollowupSent(id) {
  await db.query(
    `UPDATE campaign_data
     SET follow_up_sent    = 1,
         follow_up_sent_at = NOW()
     WHERE id = ?`,
    [id]
  );
}

// ─────────────────────────────────────────────
//  PLACEHOLDER MERGE  {Name} / {{name}}
// ─────────────────────────────────────────────
function mergePlaceholders(content, lead) {
  let out = content || "";
  const name    = lead.name  || "";
  const email   = lead.email || "";
  const payload = lead.payload
    ? (typeof lead.payload === "string" ? JSON.parse(lead.payload) : lead.payload)
    : {};
  const allFields = { name, email, Name: name, Email: email, ...payload };
  for (const [key, value] of Object.entries(allFields)) {
    const safe = String(value || "");
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
    out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`,       "gi"), safe);
  }
  return out;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ─────────────────────────────────────────────
//  SEND ONE FOLLOW-UP
// ─────────────────────────────────────────────
async function sendOneFollowup(row) {
  const subject = (row.followup_subject && row.followup_subject.trim())
    ? row.followup_subject.trim()
    : (`Re: ${row.original_subject || ""}`).trim() || "Re:";

  let htmlBody = mergePlaceholders(
    row.followup_body_html ||
      `<p>Hi${row.name ? " " + row.name : ""}, just following up on my previous email.</p>`,
    row
  );

  // Tracking pixel
  const trackingPixel = `<img src="${process.env.APP_URL}/api/track/open?cid=${row.campaign_id}&email=${encodeURIComponent(row.email)}&t=${Date.now()}" width="1" height="1" style="display:none" />`;
  htmlBody += trackingPixel;

  // Unsubscribe link
  const token = sign({
    email:      normalizeEmail(row.email),
    userId:     row.user_id,
    campaignId: row.campaign_id,
    scope:      "all",
    exp:        Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  htmlBody += `
    <hr/>
    <p style="font-size:12px;color:#666">
      Don't want these emails?
      <a href="${process.env.APP_URL}/unsubscribe?token=${token}">Unsubscribe</a>
    </p>`;

  const account = {
    from_name:     row.from_name,
    email:         row.from_email,
    smtp_user:     row.smtp_user,
    app_password:  row.app_password,
    smtp_host:     row.smtp_host,
    smtp_port:     row.smtp_port,
    smtp_security: row.smtp_security,
  };

  const transporter = createTransporter(account);

  const extraHeaders = {};
  if (row.smtp_message_id) {
    extraHeaders["In-Reply-To"] = row.smtp_message_id;
    extraHeaders["References"]  = row.smtp_message_id;
  }

  await transporter.sendMail({
    from:    `"${account.from_name || "Campaign"}" <${account.email}>`,
    to:      row.email,
    subject,
    html:    htmlBody,
    headers: extraHeaders,
  });
}

// ─────────────────────────────────────────────
//  MAIN TICK
// ─────────────────────────────────────────────
async function runFollowups() {
  try {
    const targets = await fetchFollowupTargets(MAX_PER_TICK);

    if (!targets.length) {
      console.log("📭 Follow-up Worker: no eligible targets");
      return;
    }

    console.log(`📬 Follow-up Worker: ${targets.length} target(s) found`);

    for (const row of targets) {
      try {
        await sendOneFollowup(row);
        await markFollowupSent(row.id);
        console.log(`✅ Follow-up sent → ${row.email} from ${row.sent_from_email} [campaign_id=${row.campaign_id}]`);
      } catch (e) {
        console.error(`❌ Follow-up failed (cd.id=${row.id}):`, e.message);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  } catch (e) {
    console.error("❌ Follow-up worker tick error:", e.message);
  }
}

// ─────────────────────────────────────────────
//  CRON — every minute
// ─────────────────────────────────────────────
if (RUN_EVERY_MINUTE) {
  cron.schedule("* * * * *", async () => {
    await runFollowups();
  });
  console.log("🔁 Follow-up Worker started (every 1 min)");
}

module.exports = { runFollowups };