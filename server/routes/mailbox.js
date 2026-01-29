const express = require("express");
const router = express.Router();
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { getLatestEmailAccount } = require("../helpers/emailAccount");

/**
 * ===============================
 * GET INBOX EMAILS (ROUTE USER)
 * ===============================
 * GET /api/mailbox/inbox/:userId
 */
router.get("/inbox/:userId", async (req, res) => {
  res.set("Cache-Control", "no-store"); // 🔥 VERY IMPORTANT

  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT *
      FROM inbox_emails
      WHERE user_id = ?
      ORDER BY received_at DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("INBOX ERROR:", err);
    res.status(500).json({ success: false });
  }
});
/**
 * ===============================
 * SEND + STORE REPLY
 * ===============================
 * POST /api/mailbox/reply/:userId
 */
router.post("/reply/:userId", async (req, res) => {
  const { userId } = req.params;
  const { inboxEmailId, to, subject, message } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID required"
    });
  }

  try {
    // 1️⃣ get latest SMTP config
    const emailAccount = await getLatestEmailAccount(userId);

    if (!emailAccount) {
      return res.status(400).json({
        success: false,
        message: "No email account found"
      });
    }

    // 2️⃣ send email
    const transporter = createTransporter(emailAccount);

    await transporter.sendMail({
      from: emailAccount.from_email,
      to,
      subject,
      html: message
    });

    // 3️⃣ store reply
    await db.query(
      `
      INSERT INTO email_replies
      (inbox_email_id, user_id, to_email, subject, message, sent_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [inboxEmailId, userId, to, subject, message]
    );

    res.json({
      success: true,
      message: "Reply sent & stored"
    });
  } catch (err) {
    console.error("REPLY ERROR:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
