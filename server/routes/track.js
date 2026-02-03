const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * 🔍 EMAIL OPEN TRACKING ENDPOINT
 * GET /api/track/open?cid=<campaign_id>&email=<email>&t=<timestamp>
 * 
 * This endpoint is called when the tracking pixel is loaded by an email client.
 * It records the open event and increments counters.
 */

router.get("/open", async (req, res) => {
  const { cid, email, t } = req.query;

  console.log(`\n🔍 OPEN TRACKING REQUEST:`, {
    cid,
    email,
    timestamp: t,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  // Always return pixel (never block the image load)
  if (!cid || !email) {
    console.log("⚠️ Missing cid or email parameter");
    return sendPixel(res);
  }

  let conn;
  try {
    conn = await db.getConnection();

    // Check if record exists
    const [rows] = await conn.query(
      `SELECT opened_at, open_count FROM campaign_data
       WHERE campaign_id = ? AND email = ?`,
      [cid, email]
    );

    if (rows.length === 0) {
      console.log(`⚠️ No campaign_data record found for cid=${cid}, email=${email}`);
      return sendPixel(res);
    }

    const currentRecord = rows[0];
    const isFirstOpen = currentRecord.opened_at === null || currentRecord.opened_at === '0000-00-00 00:00:00';

    console.log(`📊 Current record:`, {
      opened_at: currentRecord.opened_at,
      open_count: currentRecord.open_count,
      isFirstOpen
    });

    // Update campaign_data - set opened_at on first open, increment counter always
    const [updateResult] = await conn.query(
      `UPDATE campaign_data
       SET opened_at = CASE 
                        WHEN opened_at IS NULL OR opened_at = '0000-00-00 00:00:00' 
                        THEN NOW() 
                        ELSE opened_at 
                      END,
           open_count = open_count + 1,
           status = CASE 
                      WHEN status = 'sent' THEN 'opened' 
                      ELSE status 
                    END
       WHERE campaign_id = ? AND email = ?`,
      [cid, email]
    );

    console.log(`✅ Updated campaign_data: ${updateResult.affectedRows} row(s)`);

    // Increment campaign opened_count ONLY on first open
    if (isFirstOpen) {
      const [campaignUpdate] = await conn.query(
        `UPDATE email_campaigns
         SET opened_count = opened_count + 1
         WHERE id = ?`,
        [cid]
      );

      console.log(`✅ Updated email_campaigns opened_count: ${campaignUpdate.affectedRows} row(s)`);
    } else {
      console.log(`ℹ️ Not first open, campaign counter unchanged`);
    }

    // Verify the update
    const [verifyRows] = await conn.query(
      `SELECT opened_at, open_count, status FROM campaign_data
       WHERE campaign_id = ? AND email = ?`,
      [cid, email]
    );

    console.log(`✅ TRACKING SUCCESS:`, {
      email,
      campaign_id: cid,
      opened_at: verifyRows[0]?.opened_at,
      open_count: verifyRows[0]?.open_count,
      status: verifyRows[0]?.status,
      isFirstOpen
    });

  } catch (err) {
    console.error("❌ Open tracking error:", err);
  } finally {
    if (conn) conn.release();
  }

  return sendPixel(res);
});

/**
 * 🔗 LINK CLICK TRACKING ENDPOINT
 * GET /api/track/click?cid=<campaign_id>&email=<email>&url=<destination>
 * 
 * Optional: Track link clicks in emails
 */
router.get("/click", async (req, res) => {
  const { cid, email, url } = req.query;

  console.log(`\n🔗 CLICK TRACKING REQUEST:`, { cid, email, url });

  if (!cid || !email || !url) {
    return res.status(400).send("Missing parameters");
  }

  let conn;
  try {
    conn = await db.getConnection();

    // Check if record exists
    const [rows] = await conn.query(
      `SELECT clicked_at FROM campaign_data
       WHERE campaign_id = ? AND email = ?`,
      [cid, email]
    );

    if (rows.length === 0) {
      console.log(`⚠️ No campaign_data record found for click tracking`);
      return res.redirect(decodeURIComponent(url));
    }

    const isFirstClick = rows[0].clicked_at === null || rows[0].clicked_at === '0000-00-00 00:00:00';

    // Update campaign_data
    await conn.query(
      `UPDATE campaign_data
       SET clicked_at = CASE 
                         WHEN clicked_at IS NULL OR clicked_at = '0000-00-00 00:00:00' 
                         THEN NOW() 
                         ELSE clicked_at 
                       END
       WHERE campaign_id = ? AND email = ?`,
      [cid, email]
    );

    // Increment campaign clicked_count ONLY on first click
    if (isFirstClick) {
      await conn.query(
        `UPDATE email_campaigns
         SET clicked_count = clicked_count + 1
         WHERE id = ?`,
        [cid]
      );
    }

    console.log(`✅ Click tracked successfully for ${email}`);

  } catch (err) {
    console.error("❌ Click tracking error:", err);
  } finally {
    if (conn) conn.release();
  }

  // Redirect to the actual URL
  return res.redirect(decodeURIComponent(url));
});

/**
 * 🔹 Helper: Always send 1x1 transparent GIF
 * This is critical for email tracking to work reliably
 */
function sendPixel(res) {
  const img = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    "base64"
  );

  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.status(200).end(img);
}

module.exports = router;