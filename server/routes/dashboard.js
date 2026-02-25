// routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/overview", async (req, res) => {
  try {
    // ✅ FIX: Accept userId from query param (like campaign routes do)
    // OR fall back to session if available
    const userId =
      req.query.userId ||
      req.session?.user?.id ||
      req.session?.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const uid = parseInt(userId, 10);
    if (!Number.isFinite(uid)) return res.status(400).json({ message: "Invalid userId" });

    /* ---------------- Total Campaigns ---------------- */
    const [[totalCampaignsRow]] = await db.query(
      `SELECT COUNT(*) AS c FROM email_campaigns WHERE user_id = ?`,
      [uid]
    );

    /* ---------------- Total Leads ---------------- */
    const [[leadsRow]] = await db.query(
      `SELECT COUNT(*) AS c FROM leads WHERE user_id = ?`,
      [uid]
    );

    /* ---------------- Mailbox Emails (received) ---------------- */
    const [[mailboxRow]] = await db.query(
      `SELECT COUNT(*) AS c FROM inbox_emails WHERE user_id = ?`,
      [uid]
    );

    /* ---------------- Open Rate ---------------- */
    const [[aggRow]] = await db.query(
      `SELECT
         COALESCE(SUM(sent_count), 0)   AS sent_total,
         COALESCE(SUM(opened_count), 0) AS opened_total
       FROM email_campaigns
       WHERE user_id = ?`,
      [uid]
    );

    const openRate =
      aggRow.sent_total > 0
        ? (aggRow.opened_total / aggRow.sent_total) * 100
        : 0;

    /* ---------------- Recent Campaigns (last 5) ---------------- */
    const [recentCampaigns] = await db.query(
      `SELECT
         id,
         name            AS campaign_name,
         status,
         created_at,
         scheduled_at,
         total_recipients,
         sent_count,
         opened_count,
         clicked_count
       FROM email_campaigns
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [uid]
    );

    res.json({
      activeCampaigns: Number(totalCampaignsRow.c),
      totalLeads:      Number(leadsRow.c),
      emailsSent:      Number(mailboxRow.c),
      openRate:        Number(openRate.toFixed(1)),
      recentCampaigns,
    });
  } catch (err) {
    console.error("DASHBOARD OVERVIEW ERROR:", err);
    res.status(500).json({ message: "Failed to load dashboard overview" });
  }
});

module.exports = router;