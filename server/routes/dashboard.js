const express = require("express");
const router = express.Router();

/**
 * GET /api/dashboard/overview
 * Uses the MySQL pool from app.locals.db (set in server.js)
 */
router.get("/overview", async (req, res) => {
  const db = req.app.locals.db;

  try {
    /* ---------------- Active Campaigns ----------------
       If campaign_data has status, count active. Otherwise count all campaigns. */
    let activeCampaigns = 0;
    try {
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS c FROM campaign_data WHERE status = 'active'`
      );
      activeCampaigns = row?.c ?? 0;
    } catch (e) {
      const [[row]] = await db.query(`SELECT COUNT(*) AS c FROM campaign_data`);
      activeCampaigns = row?.c ?? 0;
    }

    /* ---------------- Total Leads ---------------- */
    const [[leadsRow]] = await db.query(`SELECT COUNT(*) AS c FROM leads`);
    const totalLeads = leadsRow?.c ?? 0;

    /* ---------------- Emails Sent (FIXED) ----------------
       Count each sent email from email_campaigns table.
       If you store a delivery/status column, you can filter it later. */
    const [[sentRow]] = await db.query(
      `SELECT COUNT(*) AS c FROM email_campaigns`
    );
    const emailsSent = sentRow?.c ?? 0;

    /* ---------------- Opens (Unique opens recommended) ---------------- */
    const [[opensRow]] = await db.query(
      `SELECT COUNT(DISTINCT lead_id) AS c
       FROM email_events
       WHERE event_type = 'open'`
    );
    const uniqueOpens = opensRow?.c ?? 0;

    /* ---------------- Open Rate (FIXED) ---------------- */
    const openRate = emailsSent > 0 ? (uniqueOpens / emailsSent) * 100 : 0;

    /* ---------------- Recent Campaigns ----------------
       Try common columns; fallback to safest known columns. */
    let recentCampaigns = [];
    try {
      const [rows] = await db.query(
        `SELECT id, campaign_name, created_at, opened_count, clicked_count
         FROM campaign_data
         ORDER BY created_at DESC
         LIMIT 5`
      );
      recentCampaigns = rows;
    } catch (e) {
      const [rows] = await db.query(
        `SELECT id, opened_count, clicked_count
         FROM campaign_data
         ORDER BY id DESC
         LIMIT 5`
      );
      recentCampaigns = rows;
    }

    return res.json({
      activeCampaigns,
      totalLeads,
      emailsSent,
      openRate: Number(openRate.toFixed(1)),
      recentCampaigns,
    });
  } catch (err) {
    console.error("DASHBOARD OVERVIEW ERROR:", err.message);
    return res.status(500).json({ message: "Failed to load dashboard overview" });
  }
});

module.exports = router;