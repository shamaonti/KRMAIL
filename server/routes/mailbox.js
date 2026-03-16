const express = require("express");
const router = express.Router();
const db = require("../db");
const { createTransporter } = require("../helpers/mailer");
const { getEmailAccountByAddress } = require("../helpers/emailAccount");

/* ===============================
   GET INBOX EMAILS
================================ */
router.get("/inbox/:userId", async (req, res) => {
  res.set("Cache-Control", "no-store");

  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        ie.id,
        ie.user_id,
        ie.account_email,
        ie.from_email,
        ie.to_email,
        ie.subject,
        ie.body,
        ie.preview,
        ie.is_read,
        ie.received_at
      FROM inbox_emails ie
      INNER JOIN user_email_accounts uea 
        ON ie.account_email = uea.from_email 
        AND uea.user_id = ie.user_id
      WHERE ie.user_id = ?
      ORDER BY ie.account_email, ie.received_at DESC
      `,
      [userId]
    );

    const grouped = {};
    rows.forEach((mail) => {
      if (!grouped[mail.account_email]) grouped[mail.account_email] = [];
      grouped[mail.account_email].push(mail);
    });

    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error("INBOX ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ===============================
   SEND REPLY
================================ */
router.post("/reply/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const inboxEmailId = Number(req.body.inboxEmailId);
  const { to, subject, message } = req.body;

  if (!Number.isInteger(userId) || !Number.isInteger(inboxEmailId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid userId or inboxEmailId",
    });
  }

  if (!to || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Missing to/subject/message",
    });
  }

  try {
    const [[mailRow]] = await db.query(
      `SELECT account_email FROM inbox_emails WHERE id=? AND user_id=?`,
      [inboxEmailId, userId]
    );

    if (!mailRow) {
      return res
        .status(404)
        .json({ success: false, message: "Inbox email not found" });
    }

    const emailAccount = await getEmailAccountByAddress(
      userId,
      mailRow.account_email
    );

    if (!emailAccount) {
      return res
        .status(400)
        .json({ success: false, message: "Email account config not found" });
    }

    const transporter = createTransporter(emailAccount);

    // IMPORTANT: Many SMTP servers require FROM to match authenticated user
    const smtpUser = emailAccount.smtp_user || emailAccount.email;

    await transporter.sendMail({
      from: smtpUser,
      to,
      subject,
      html: message,
      text: stripHtml(message),
      replyTo: smtpUser,
    });

    await db.query(
      `
      INSERT INTO email_replies
      (inbox_email_id, user_id, from_email, to_email, subject, message, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [inboxEmailId, userId, smtpUser, to, subject, message]
    );

    res.json({ success: true, message: "Reply sent & stored" });
  } catch (err) {
    console.error("REPLY ERROR:", err);
    res.status(500).json({
      success: false,
      message: err?.message || "Failed to send reply",
    });
  }
});

function stripHtml(html = "") {
  return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

module.exports = router;