const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/overview", async (req, res) => {
  try {
   const userId = req.session?.user?.id || req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    /* ---------------- Total Campaigns (email_campaigns) ---------------- */
    const [[totalCampaignsRow]] = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM email_campaigns
      WHERE user_id = ?
      `,
      [userId]
    );

    /* ---------------- Total Leads ---------------- */
    const [[leadsRow]] = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM leads
      WHERE user_id = ?
      `,
      [userId]
    );

    /* ---------------- Mailbox Emails (received emails) ---------------- */
    // NOTE: table/column name apne actual schema ke hisaab se adjust karein
    const [[mailboxRow]] = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM inbox_emails
      WHERE user_id = ?
      `,
      [userId]
    );

    /* ---------------- Open Rate (from email_campaigns) ---------------- */
    // simplest: total opened / total sent (campaign-level)
    const [[aggRow]] = await db.query(
      `
      SELECT
        COALESCE(SUM(sent_count), 0) AS sent_total,
        COALESCE(SUM(opened_count), 0) AS opened_total
      FROM email_campaigns
      WHERE user_id = ?
      `,
      [userId]
    );

    const openRate =
      aggRow.sent_total > 0 ? (aggRow.opened_total / aggRow.sent_total) * 100 : 0;

    /* ---------------- Recent Campaigns (last 5 by created_at) ---------------- */
    const [recentCampaigns] = await db.query(
      `
      SELECT
        id,
        name AS campaign_name,
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
      LIMIT 5
      `,
      [userId]
    );

    res.json({
      // frontend key "activeCampaigns" same rahega (aapke note ke hisaab se)
      activeCampaigns: totalCampaignsRow.c,

      totalLeads: leadsRow.c,

      // frontend me "Emails Sent" card actually mailbox count dikhata hai
      emailsSent: mailboxRow.c,

      openRate: Number(openRate.toFixed(1)),

      recentCampaigns,
    });
  } catch (err) {
    console.error("DASHBOARD OVERVIEW ERROR:", err);
    res.status(500).json({ message: "Failed to load dashboard overview" });
  }
});

module.exports = router;