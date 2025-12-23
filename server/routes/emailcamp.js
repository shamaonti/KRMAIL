const express = require('express');
const router = express.Router();
const pool = require('../db');

// We skip the session check and just take the ID from the frontend
router.post('/save', async (req, res) => {
    const {
        userId, // We fetch this from your frontend now
        fromName, fromEmail, smtpUsername, smtpPassword, smtpHost, smtpPort, smtpSecurity,
        replyTo, useDifferentImap, imapUsername, imapPassword, imapHost, imapPort, imapSecurity,
        signature, dailyLimit, intervalMinutes
    } = req.body;

    // Safety check: ensure a userId was actually sent
    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is missing. Please log in again.' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO user_email_accounts
            (user_id, from_name, from_email, smtp_username, smtp_password, smtp_host, smtp_port, smtp_security, reply_to, use_different_imap, imap_username, imap_password, imap_host, imap_port, imap_security, signature, daily_limit, interval_minutes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, // This comes directly from your 'users' table via the frontend
                fromName || null, fromEmail, smtpUsername || null, smtpPassword || null, 
                smtpHost, parseInt(smtpPort) || 587, smtpSecurity || 'none', 
                replyTo || null, useDifferentImap ? 1 : 0, imapUsername || null, 
                imapPassword || null, imapHost || null, parseInt(imapPort) || null, 
                imapSecurity || 'none', signature || null, dailyLimit || 50, intervalMinutes || 10
            ]
        );

        res.status(201).json({ success: true, message: 'Saved successfully!' });
    } catch (err) {
        console.error("DATABASE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;