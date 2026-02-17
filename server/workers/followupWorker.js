// server/workers/followupWorker.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const cron = require("node-cron");
const moment = require("moment-timezone");

const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { sign } = require("../helpers/unsubscribeToken");

// ---- CONFIG ----
const RUN_EVERY_MINUTE = true;
const MAX_PER_TICK = 20;
const DELAY_MS = 300;

// follow_up_sent states:
// 0 = not sent, eligible
// 1 = follow-up sent
// 2 = claimed (in-progress) to prevent duplicate sends

// ─────────────────────────────────────────────
//  SENDING WINDOW CHECK (timezone + from/to)
// ─────────────────────────────────────────────
function isWithinSendingWindow(row) {
  const tz = row.time_zone || "UTC";
  const from = row.sending_from || "09:00";
  const to = row.sending_to || "17:00";

  const now = moment().tz(tz);
  const start = moment.tz(
    `${now.format("YYYY-MM-DD")} ${from}`,
    "YYYY-MM-DD HH:mm",
    tz
  );
  const end = moment.tz(
    `${now.format("YYYY-MM-DD")} ${to}`,
    "YYYY-MM-DD HH:mm",
    tz
  );

  // overnight window (e.g., 22:00 -> 06:00)
  if (end.isSameOrBefore(start)) {
    return now.isSameOrAfter(start) || now.isBefore(end);
  }

  return now.isSameOrAfter(start) && now.isBefore(end);
}

// ─────────────────────────────────────────────
//  FETCH ELIGIBLE FOLLOW-UP TARGETS
//  - Delay supports decimals by using SECOND interval
//  - Condition (not_opened/not_clicked/no_reply/always)
//  - Unsubscribe guard
//  - Excludes replied
//  - DOES NOT enforce sending window here (done in JS, timezone-safe)
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
      cd.replied_at                        AS replied_at,

      ec.subject                           AS original_subject,
      ec.followup_condition                AS followup_condition,
      ec.followup_delay_hours              AS followup_delay_hours,

      -- ✅ TIME SETTINGS (must exist in email_campaigns, add defaults in UI/db if not)
      ec.time_zone                         AS time_zone,
      ec.sending_from                      AS sending_from,
      ec.sending_to                        AS sending_to,

      ft.subject                           AS followup_subject,
      ft.content                           AS followup_body_html,

      uea.from_name                        AS from_name,
      uea.from_email                       AS from_email,
      uea.smtp_host                        AS smtp_host,
      uea.smtp_port                        AS smtp_port,
      uea.smtp_security                    AS smtp_security,
      uea.smtp_username                    AS smtp_user,
      uea.smtp_password                    AS app_password

    FROM campaign_data cd

    JOIN email_campaigns ec
      ON ec.id = cd.campaign_id
     AND ec.has_followup = 1
     AND ec.followup_template_id IS NOT NULL
     AND ec.followup_delay_hours IS NOT NULL

    JOIN email_templates ft
      ON ft.id      = ec.followup_template_id
     AND ft.user_id = ec.user_id

    JOIN user_email_accounts uea
      ON uea.user_id    = ec.user_id
     AND uea.from_email = cd.sent_from_email

    -- ✅ scope-aware unsubscribe
    LEFT JOIN unsubscribes u
      ON u.user_id = ec.user_id
     AND LOWER(TRIM(u.email)) = LOWER(TRIM(cd.email))
     AND (
           u.scope = 'all'
           OR (u.scope = 'campaign' AND u.campaign_id = cd.campaign_id)
         )

    WHERE cd.status          = 'sent'
      AND cd.follow_up_sent  = 0
      AND cd.sent_at         IS NOT NULL

      -- ✅ no follow-up if replied
      AND cd.replied_at      IS NULL

      -- ✅ Delay (supports decimals like 0.083 hours)
      AND cd.sent_at <= DATE_SUB(NOW(), INTERVAL (ec.followup_delay_hours * 3600) SECOND)

      -- ✅ Unsubscribe guard
      AND u.id IS NULL

    ORDER BY cd.sent_at ASC
    LIMIT ?
    `,
    [limit]
  );

  // ✅ followup_condition filter — 'not_opened', 'not_clicked', 'always', 'no_reply'
  return rows.filter((row) => {
    const condition = row.followup_condition || "always";
    if (condition === "always") return true;
    if (condition === "not_opened") return row.opened_at === null;
    if (condition === "not_clicked") return row.clicked_at === null;
    if (condition === "no_reply") return row.replied_at === null;
    return true;
  });
}

// ─────────────────────────────────────────────
//  CLAIM ROW (prevents double-send if cron overlaps or multiple instances)
// ─────────────────────────────────────────────
async function claimFollowup(id) {
  const [res] = await db.query(
    `
    UPDATE campaign_data
    SET follow_up_sent = 2
    WHERE id = ? AND follow_up_sent = 0
    `,
    [id]
  );
  return res.affectedRows === 1;
}

// ─────────────────────────────────────────────
//  MARK FOLLOW-UP SENT
// ─────────────────────────────────────────────
async function markFollowupSent(id) {
  await db.query(
    `
    UPDATE campaign_data
    SET follow_up_sent    = 1,
        follow_up_sent_at = NOW()
    WHERE id = ?
    `,
    [id]
  );
}

// ─────────────────────────────────────────────
//  RELEASE CLAIM (if send fails, allow retry next ticks)
// ─────────────────────────────────────────────
async function releaseClaim(id) {
  await db.query(
    `
    UPDATE campaign_data
    SET follow_up_sent = 0
    WHERE id = ? AND follow_up_sent = 2
    `,
    [id]
  );
}

function mergePlaceholders(content, lead) {
  let out = content || "";
  const name = lead.name || "";
  const email = lead.email || "";

  let payload = {};
  try {
    payload =
      lead.payload
        ? typeof lead.payload === "string"
          ? JSON.parse(lead.payload)
          : lead.payload
        : {};
  } catch {
    payload = {};
  }

  const allFields = { name, email, Name: name, Email: email, ...payload };
  for (const [key, value] of Object.entries(allFields)) {
    const safe = String(value ?? "");
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), safe);
    out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"), safe);
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
  const subject =
    row.followup_subject && row.followup_subject.trim()
      ? row.followup_subject.trim()
      : (`Re: ${row.original_subject || ""}`).trim() || "Re:";

  let htmlBody = mergePlaceholders(
    row.followup_body_html ||
      `<p>Hi${row.name ? " " + row.name : ""}, just following up on my previous email.</p>`,
    row
  );

  // Tracking pixel
  const trackingPixel = `<img src="${process.env.APP_URL}/api/track/open?cid=${row.campaign_id}&email=${encodeURIComponent(
    row.email
  )}&t=${Date.now()}" width="1" height="1" style="display:none" />`;
  htmlBody += trackingPixel;

  // Unsubscribe link (global)
  const token = sign({
    email: normalizeEmail(row.email),
    userId: row.user_id,
    campaignId: row.campaign_id,
    scope: "all",
    exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  htmlBody += `
    <hr/>
    <p style="font-size:12px;color:#666">
      Don't want these emails?
      <a href="${process.env.APP_URL}/unsubscribe?token=${token}">Unsubscribe</a>
    </p>`;

  const account = {
    from_name: row.from_name,
    email: row.from_email,
    smtp_user: row.smtp_user,
    app_password: row.app_password,
    smtp_host: row.smtp_host,
    smtp_port: row.smtp_port,
    smtp_security: row.smtp_security,
  };

  const transporter = createTransporter(account);

  const extraHeaders = {};
  if (row.smtp_message_id) {
    extraHeaders["In-Reply-To"] = row.smtp_message_id;
    extraHeaders["References"] = row.smtp_message_id;
  }

  await transporter.sendMail({
    from: `"${account.from_name || "Campaign"}" <${account.email}>`,
    to: row.email,
    subject,
    html: htmlBody,
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
        // ✅ Enforce sending hours + timezone
        if (!isWithinSendingWindow(row)) {
          console.log(
            `⏳ Outside sending window (${row.time_zone || "UTC"} ${row.sending_from || "09:00"}-${row.sending_to || "17:00"}) → skip ${row.email}`
          );
          continue;
        }

        // ✅ Claim row to prevent duplicate sending
        const claimed = await claimFollowup(row.id);
        if (!claimed) {
          // someone else already claimed/sent it
          continue;
        }

        await sendOneFollowup(row);
        await markFollowupSent(row.id);

        console.log(
          `✅ Follow-up sent → ${row.email} from ${row.sent_from_email} [campaign_id=${row.campaign_id}]`
        );
      } catch (e) {
        console.error(`❌ Follow-up failed (cd.id=${row.id}):`, e.message);
        // allow retry next tick
        try {
          await releaseClaim(row.id);
        } catch (_) {}
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
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
