const express = require("express");
const router = express.Router();
const db = require('../db');

/**
 * GET /api/dashboard/overview
 * Uses the MySQL pool from app.locals.db (set in server.js)
 */
router.get("/overview", async (req, res) => {
  try {
    /* ---------------- Active Campaigns ---------------- */
    const [[activeRow]] = await db.query(`
      SELECT COUNT(DISTINCT campaign_id) AS c
      FROM campaign_data
      WHERE status IN ('sent','opened','clicked')
    `);

    /* ---------------- Total Leads ---------------- */
    const [[leadsRow]] = await db.query(`
      SELECT COUNT(*) AS c FROM leads
    `);

    /* ---------------- Emails Sent ---------------- */
    const [[sentRow]] = await db.query(`
      SELECT COUNT(*) AS c
      FROM campaign_data
      WHERE status IN ('sent','opened','clicked')
    `);

    /* ---------------- Unique Opens ---------------- */
    const [[opensRow]] = await db.query(`
      SELECT COUNT(*) AS c
      FROM campaign_data
      WHERE open_count > 0
    `);

    const openRate =
      sentRow.c > 0 ? (opensRow.c / sentRow.c) * 100 : 0;

    /* ---------------- Recent Campaigns ---------------- */
    const [recentCampaigns] = await db.query(`
      SELECT
        campaign_id,
        COUNT(*) AS total_emails,
        SUM(open_count > 0) AS opened_emails,
        SUM(clicked_at IS NOT NULL) AS clicked_emails,
        MAX(created_at) AS last_activity
      FROM campaign_data
      GROUP BY campaign_id
      ORDER BY last_activity DESC
      LIMIT 5
    `);

    res.json({
      activeCampaigns: activeRow.c,
      totalLeads: leadsRow.c,
      emailsSent: sentRow.c,
      openRate: Number(openRate.toFixed(1)),
      recentCampaigns,
    });
  } catch (err) {
    console.error("DASHBOARD OVERVIEW ERROR:", err);
    res.status(500).json({ message: "Failed to load dashboard overview" });
  }
});


module.exports = router;