// routes/unsubscribe.js
const express = require("express");
const router = express.Router();

const db = require("../db");
const { verify } = require("../helpers/unsubscribeToken");

// GET /unsubscribe?token=...
router.get("/", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("Missing token");

  const v = verify(token);
  if (!v.ok) return res.status(400).send("Invalid or expired unsubscribe link");

  const { email, userId, campaignId, scope } = v.payload || {};
  if (!email) return res.status(400).send("Invalid token payload");

  // ✅ normalize email so comparisons never fail
  const emailNorm = String(email).trim().toLowerCase();
  const scopeValue = scope || "all";

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    null;

  const userAgent = req.get("User-Agent") || null;

  let conn;
  try {
    conn = await db.getConnection();

    // Store unsubscribe (normalized)
    await conn.query(
      `INSERT INTO unsubscribes (email, user_id, campaign_id, scope, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         campaign_id = VALUES(campaign_id),
         scope = VALUES(scope),
         ip = VALUES(ip),
         user_agent = VALUES(user_agent),
         created_at = CURRENT_TIMESTAMP`,
      [
        emailNorm,
        userId || null,
        campaignId || null,
        scopeValue,
        ip,
        userAgent,
      ]
    );

    // ✅ CRITICAL:
    // Cancel any pending sends that were already queued/scheduled.

    if (scopeValue === "all") {
      // Cancel across ALL campaigns
      await conn.query(
        `UPDATE campaign_data
         SET status = 'unsubscribed'
         WHERE LOWER(TRIM(email)) = ?
           AND status IN ('pending','queued','scheduled','sending')`,
        [emailNorm]
      );
    } else {
      // Cancel only this campaign
      await conn.query(
        `UPDATE campaign_data
         SET status = 'unsubscribed'
         WHERE campaign_id = ?
           AND LOWER(TRIM(email)) = ?
           AND status IN ('pending','queued','scheduled','sending')`,
        [campaignId || 0, emailNorm]
      );
    }

    return res.status(200).send(`
      <html>
        <head>
          <title>Unsubscribed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family: Arial; background:#f6f7fb; padding:40px;">
          <div style="max-width:560px;margin:auto;background:#fff;padding:24px;border:1px solid #eee;border-radius:12px;">
            <h2 style="margin:0 0 12px 0;">✅ You’re unsubscribed</h2>
            <p style="margin:0;color:#444;">
              <b>${emailNorm}</b> will no longer receive these emails.
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return res.status(500).send("Something went wrong");
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
