const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * ============================================
 * 1. SAVE OR UPDATE EMAIL ACCOUNT (UPSERT)
 * ============================================
 * Rule:
 * - Ek user + ek from_email = ek hi active config
 * - Agar same email dobara save ho → UPDATE (based on ID if exists, or from_email)
 */
router.post('/save', async (req, res) => {
  const {
    userId,
    recordId,  // ✅ NEW: Frontend se ID bhi aayega agar edit kar rahe hain
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
  console.log('🆔 RECORD ID:', recordId);

  try {
    // Check if record exists
    const [existing] = await pool.query(
      'SELECT id FROM user_email_accounts WHERE user_id = ? AND from_email = ?',
      [userId, fromEmail]
    );

    let query, values;

    if (existing.length > 0 || recordId) {
      // ✅ UPDATE existing record
      const updateId = recordId || existing[0].id;
      
      query = `
        UPDATE user_email_accounts SET
          from_name = ?,
          smtp_username = ?,
          ${smtpPassword && smtpPassword.trim() ? 'smtp_password = ?,' : ''}
          smtp_host = ?,
          smtp_port = ?,
          smtp_security = ?,
          reply_to = ?,
          use_different_imap = ?,
          imap_username = ?,
          ${imapPassword && imapPassword.trim() ? 'imap_password = ?,' : ''}
          imap_host = ?,
          imap_port = ?,
          imap_security = ?,
          signature = ?,
          daily_limit = ?,
          interval_minutes = ?,
          created_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;

      values = [
        fromName || null,
        smtpUsername || fromEmail,
        ...(smtpPassword && smtpPassword.trim() ? [smtpPassword.trim()] : []),
        smtpHost || null,
        parseInt(smtpPort) || 587,
        smtpSecurity || 'tls',
        replyTo || null,
        useDifferentImap ? 1 : 0,
        imapUsername || null,
        ...(imapPassword && imapPassword.trim() ? [imapPassword.trim()] : []),
        imapHost || null,
        parseInt(imapPort) || null,
        imapSecurity || 'ssl',
        signature || null,
        dailyLimit || 50,
        intervalMinutes || 10,
        updateId,
        userId
      ];

      console.log('🔄 UPDATING record ID:', updateId);

    } else {
      // ✅ INSERT new record
      query = `
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
      `;

      values = [
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

      console.log('➕ INSERTING new record');
    }

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
router.get('/details/:userId', async (req, res) => {
  const { userId } = req.params;

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
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );
    //console.log('📬 FETCHED EMAIL ACCOUNT:', rows);
    
    return res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error('❌ FETCH ERROR:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================
// REAL TEST CONNECTION ROUTE
// ============================================
router.post('/test', async (req, res) => {
  const {
    smtpHost,
    smtpPort,
    smtpUsername,
    smtpPassword,
    smtpSecurity
  } = req.body;

  if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
    return res.status(400).json({
      success: false,
      message: "SMTP details are required"
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecurity === "ssl", // true only for 465
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      }
    });

    await transporter.verify(); // 🔥 real connection check

    return res.json({
      success: true,
      message: "Test Connection Successful"
    });

  } catch (error) {
    console.error("SMTP ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Invalid SMTP credentials or connection failed"
    });
  }
});
 
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM user_email_accounts WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.json({ success: true, message: 'Email account deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;