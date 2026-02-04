const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * ============================================
 * 1. SAVE OR UPDATE EMAIL ACCOUNT (UPSERT)
 * ============================================
 * Rule:
 * - Ek user + ek from_email = ek hi active config
 * - Agar same email dobara save ho → UPDATE
 */
router.post('/save', async (req, res) => {
  const {
    userId,
    fromName,
    fromEmail,
    smtpUsername,
    smtpPassword,
    smtpHost,
    smtpPort,
    smtpSecurity,
    replyTo,
    useDifferentImap,
    imapUsername,
    imapPassword,
    imapHost,
    imapPort,
    imapSecurity,
    signature,
    dailyLimit,
    intervalMinutes
  } = req.body;

  if (!userId || !fromEmail) {
    return res.status(400).json({
      success: false,
      message: 'User ID and From Email are required'
    });
  }

  console.log('📩 SMTP PASSWORD RECEIVED:', smtpPassword ? 'YES' : 'NO');

  try {
    /**
     * IMPORTANT:
     * Table must have UNIQUE KEY (user_id, from_email)
     */
    const query = `
      INSERT INTO user_email_accounts (
        user_id,
        from_name,
        from_email,
        smtp_username,
        smtp_password,
        smtp_host,
        smtp_port,
        smtp_security,
        reply_to,
        use_different_imap,
        imap_username,
        imap_password,
        imap_host,
        imap_port,
        imap_security,
        signature,
        daily_limit,
        interval_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        from_name = VALUES(from_name),
        smtp_username = VALUES(smtp_username),
        smtp_password = VALUES(smtp_password),
        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_security = VALUES(smtp_security),
        reply_to = VALUES(reply_to),
        use_different_imap = VALUES(use_different_imap),
        imap_username = VALUES(imap_username),
        imap_password = VALUES(imap_password),
        imap_host = VALUES(imap_host),
        imap_port = VALUES(imap_port),
        imap_security = VALUES(imap_security),
        signature = VALUES(signature),
        daily_limit = VALUES(daily_limit),
        interval_minutes = VALUES(interval_minutes),
        created_at = CURRENT_TIMESTAMP
    `;

    const values = [
      userId,
      fromName || null,
      fromEmail,
      smtpUsername || fromEmail,
      smtpPassword && smtpPassword.trim() ? smtpPassword.trim() : null,
      smtpHost || null,
      parseInt(smtpPort) || 587,
      smtpSecurity || 'tls',
      replyTo || null,
      useDifferentImap ? 1 : 0,
      imapUsername || null,
      imapPassword || null,
      imapHost || null,
      parseInt(imapPort) || null,
      imapSecurity || 'ssl',
      signature || null,
      dailyLimit || 50,
      intervalMinutes || 10
    ];

    await pool.query(query, values);

    return res.json({
      success: true,
      message: 'Email account saved successfully'
    });

  } catch (err) {
    console.error('❌ SAVE ERROR:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


/**
 * ============================================
 * 2. FETCH LATEST SAVED EMAIL ACCOUNT
 * ============================================
 * Rule:
 * - Hamesha LATEST record return hoga
 * - Password kabhi return nahi karna (security)
 */
router.get('/details/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        from_name,
        from_email,
        smtp_username,
        smtp_host,
        smtp_port,
        smtp_security,
        reply_to,
        use_different_imap,
        imap_username,
        imap_host,
        imap_port,
        imap_security,
        signature,
        daily_limit,
        interval_minutes,
        created_at
      FROM user_email_accounts
      WHERE from_email = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (!rows.length) {
      return res.json({
        success: false,
        message: 'No email account found'
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });

  } catch (err) {
    console.error('❌ FETCH ERROR:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;


