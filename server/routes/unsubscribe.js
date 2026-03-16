// routes/unsubscribe.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { verify } = require("../helpers/unsubscribeToken");

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ─── Shared HTML page builder ─────────────────────────────────────────────────
function buildPage({ title, heading, message, showForm = false, email = "", token = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f0f2f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 40px 36px;
      max-width: 480px;
      width: 100%;
    }
    .logo {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 24px;
    }
    h2 { font-size: 20px; color: #1a1a2e; margin-bottom: 10px; }
    p  { color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
    .notice {
      background: #eef2ff;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 13px;
      color: #444;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .notice a { color: #4f6ef7; }
    label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 6px; }
    input[type="email"] {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
      outline: none;
      transition: border 0.2s;
    }
    input[type="email"]:focus { border-color: #4f6ef7; }
    .reasons { margin-bottom: 24px; }
    .reason-label {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      font-size: 14px;
      color: #333;
      cursor: pointer;
    }
    .reason-label input[type="radio"] { width: 16px; height: 16px; accent-color: #4f6ef7; }
    button[type="submit"] {
      width: 100%;
      background: #4f6ef7;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 13px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button[type="submit"]:hover { background: #3a57d6; }
    .success { text-align: center; }
    .success .icon { font-size: 48px; margin-bottom: 16px; }
    .success h2 { font-size: 22px; margin-bottom: 10px; }
    .error-msg { color: #e53e3e; font-size: 13px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📧 KRMail</div>
    ${showForm ? `
      <h2>Unsubscribe</h2>
      <p>Enter your email below to stop receiving emails.</p>
      <div class="notice">
        <strong>Privacy Notice:</strong> When you unsubscribe, we mark your email as
        "Unsubscribed" in our database and retain it to ensure we do not contact you again.
      </div>
      <form method="POST" action="/unsubscribe">
        ${token ? `<input type="hidden" name="token" value="${token}" />` : ""}
        <label for="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="you@example.com"
          value="${email}"
          required
        />
        <div class="reasons">
          <label style="font-size:13px;font-weight:600;color:#333;margin-bottom:8px;display:block;">
            Reason for Unsubscribing <span style="color:#888;font-weight:400;">(Optional):</span>
          </label>
          <label class="reason-label"><input type="radio" name="reason" value="Spam" /> Spam</label>
          <label class="reason-label"><input type="radio" name="reason" value="Not required" /> Not required</label>
          <label class="reason-label"><input type="radio" name="reason" value="Not interested" /> Not interested</label>
          <label class="reason-label"><input type="radio" name="reason" value="Something I hate" /> Something I hate</label>
        </div>
        <button type="submit">Unsubscribe</button>
      </form>
    ` : `
      <div class="success">
        <div class="icon">✅</div>
        <h2>${heading}</h2>
        <p>${message}</p>
      </div>
    `}
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /unsubscribe?token=...
// Shows the unsubscribe form (pre-filled if token valid)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const token = req.query.token || "";

  // If no token — show blank form
  if (!token) {
    return res.send(buildPage({
      title: "Unsubscribe",
      showForm: true,
    }));
  }

  // Verify token
  const v = verify(token);
  if (!v.ok) {
    return res.status(400).send(buildPage({
      title: "Invalid Link",
      heading: "Invalid or Expired Link",
      message: "This unsubscribe link is invalid or has expired.",
    }));
  }

  const email = normEmail(v.payload?.email || "");

  // Show form pre-filled with email from token
  return res.send(buildPage({
    title: "Unsubscribe",
    showForm: true,
    email,
    token,
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /unsubscribe
// Handles form submission — saves to DB
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const rawEmail = req.body?.email || "";
  const reason   = req.body?.reason || null;
  const token    = req.body?.token  || "";

  const emailNorm = normEmail(rawEmail);

  if (!emailNorm || !emailNorm.includes("@")) {
    return res.status(400).send(buildPage({
      title: "Error",
      showForm: true,
      email: rawEmail,
      token,
    }));
  }

  // Try to get userId + campaignId from token
  let userId     = null;
  let campaignId = null;
  let scope      = "all";

  if (token) {
    const v = verify(token);
    if (v.ok && v.payload) {
      userId     = v.payload.userId     || null;
      campaignId = v.payload.campaignId || null;
      scope      = v.payload.scope      || "all";
    }
  }

  const ip        = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null;
  const userAgent = req.headers["user-agent"] || null;

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // ✅ Save to unsubscribes table
    await conn.query(
      `INSERT INTO unsubscribes (email, user_id, campaign_id, scope, reason, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id    = VALUES(user_id),
         campaign_id = VALUES(campaign_id),
         scope      = VALUES(scope),
         reason     = VALUES(reason),
         ip         = VALUES(ip),
         user_agent = VALUES(user_agent),
         created_at = CURRENT_TIMESTAMP`,
      [
        emailNorm,
        userId,
        scope === "campaign" ? (campaignId || null) : null,
        scope,
        reason,
        ip,
        userAgent,
      ]
    );

    // ✅ Mark pending campaign_data as unsubscribed
    if (scope === "all") {
      await conn.query(
        `UPDATE campaign_data
         SET status = 'unsubscribed'
         WHERE LOWER(TRIM(email)) = ?
           AND status IN ('pending', 'queued', 'scheduled', 'sending')`,
        [emailNorm]
      );
    } else if (scope === "campaign" && campaignId) {
      await conn.query(
        `UPDATE campaign_data
         SET status = 'unsubscribed'
         WHERE campaign_id = ?
           AND LOWER(TRIM(email)) = ?
           AND status IN ('pending', 'queued', 'scheduled', 'sending')`,
        [campaignId, emailNorm]
      );
    }

    await conn.commit();

    console.log(`✅ Unsubscribed: ${emailNorm} | scope: ${scope} | reason: ${reason || "none"}`);

    // ✅ Show success page
    return res.send(buildPage({
      title:   "Unsubscribed Successfully",
      heading: "You're unsubscribed",
      message: `<strong>${emailNorm}</strong> has been removed from our mailing list. You will no longer receive emails from us.`,
    }));

  } catch (err) {
    try { if (conn) await conn.rollback(); } catch (_) {}
    console.error("❌ Unsubscribe error:", err);
    return res.status(500).send(buildPage({
      title:   "Error",
      heading: "Something went wrong",
      message: "Please try again later.",
    }));
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;