// routes/unsubscribe.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verify } = require("../helpers/unsubscribeToken");

// normalize email so comparisons never fail
function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// check if a column exists (so UPDATE doesn't crash)
async function columnExists(conn, tableName, columnName) {
  const [rows] = await conn.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

// GET /unsubscribe?token=...
router.get("/", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("Missing token");

  const v = verify(token);
  if (!v.ok) return res.status(400).send("Invalid or expired unsubscribe link");

  const { email, userId, campaignId, scope } = v.payload || {};
  if (!email) return res.status(400).send("Invalid token payload");

  const emailNorm = normEmail(email);
  const scopeValue = scope === "campaign" ? "campaign" : "all";

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // ✅ Insert unsubscribe (only columns that exist in your base table)
    // Note: campaign_id stored only when scope=campaign, otherwise NULL
    await conn.query(
      `INSERT INTO unsubscribes (email, user_id, campaign_id, scope)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         campaign_id = VALUES(campaign_id),
         scope = VALUES(scope),
         created_at = CURRENT_TIMESTAMP`,
      [
        emailNorm,
        userId || null,
        scopeValue === "campaign" ? (campaignId || null) : null,
        scopeValue,
      ]
    );

    // ✅ Optional: cancel already queued/scheduled targets
    // Only do this if campaign_data.status exists
    const hasStatus = await columnExists(conn, "campaign_data", "status");
    if (hasStatus) {
      if (scopeValue === "all") {
        await conn.query(
          `UPDATE campaign_data
           SET status = 'unsubscribed'
           WHERE LOWER(TRIM(email)) = ?
             AND status IN ('pending','queued','scheduled','sending')`,
          [emailNorm]
        );
      } else {
        await conn.query(
          `UPDATE campaign_data
           SET status = 'unsubscribed'
           WHERE campaign_id = ?
             AND LOWER(TRIM(email)) = ?
             AND status IN ('pending','queued','scheduled','sending')`,
          [campaignId || 0, emailNorm]
        );
      }
    }

    await conn.commit();

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
              <b>${emailNorm}</b> will no longer receive ${
                scopeValue === "campaign" ? "this campaign" : "any"
              } emails.
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    console.error("Unsubscribe error:", err);
    return res.status(500).send("Something went wrong");
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;