const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const pool = require('../db'); // ✅ Correct - only pool

// Middleware to validate email data
const validateEmailData = (req, res, next) => {
  const { to, subject, htmlBody, textBody } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Recipient email (to) is required' });
  }

  if (!subject) {
    return res.status(400).json({ error: 'Email subject is required' });
  }

  if (!htmlBody && !textBody) {
    return res.status(400).json({ error: 'Email body (htmlBody or textBody) is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }

  next();
};



// =========================
// TRACK EMAIL OPEN
// =========================
router.get('/track/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.get('User-Agent');

    console.log(`📧 Email opened - Log ID: ${logId}`);

    // ✅ Update email_logs
    await pool.execute(
      'UPDATE email_logs SET status = ?, opened_at = NOW() WHERE id = ?',
      ['opened', logId]
    );

    // ✅ Insert tracking event
    await pool.execute(
      'INSERT INTO email_tracking (log_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [logId, 'open', ip, ua]
    );

  } catch (error) {
    console.error('Email tracking error:', error);
  }

  // Always return pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });

  res.end(pixel);
});



// =========================
// TRACK EMAIL CLICK
// =========================
router.get('/track/click/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { url } = req.query;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.get('User-Agent');

    console.log(`🔗 Email clicked - Log ID: ${logId}`);

    await pool.execute(
      'UPDATE email_logs SET status = ?, clicked_at = NOW() WHERE id = ?',
      ['clicked', logId]
    );

    await pool.execute(
      'INSERT INTO email_tracking (log_id, event_type, ip_address, user_agent, clicked_url) VALUES (?, ?, ?, ?, ?)',
      [logId, 'click', ip, ua, url]
    );

    if (url) {
      return res.redirect(decodeURIComponent(url));
    }

    return res.status(400).json({ error: 'No URL provided' });

  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({ error: 'Click tracking failed' });
  }
});



// =========================
// SEND SINGLE EMAIL
// =========================
router.post('/send', validateEmailData, async (req, res) => {
  try {
    const { to, subject, htmlBody, textBody, from, replyTo, attachments, logId } = req.body;

    let finalHtmlBody = htmlBody;

    if (logId && htmlBody) {
      const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:3001'}/api/email/track/${logId}" width="1" height="1" style="display:none;" />`;
      finalHtmlBody += trackingPixel;
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      htmlBody: finalHtmlBody,
      textBody,
      from,
      replyTo,
      attachments
    });

    return res.status(result.success ? 200 : 500).json(result);

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: error.message });
  }
});



// =========================
// BULK EMAIL
// =========================
router.post('/bulk', async (req, res) => {
  try {
    const { emails, options = {} } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Emails array required' });
    }

    const result = await emailService.sendBulkEmails(emails, options);

    res.json(result);

  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ error: error.message });
  }
});



// =========================
// TEST EMAIL
// =========================
router.post('/test', async (req, res) => {
  try {
    const { to, subject } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email required' });
    }

    const result = await emailService.testEmail(to, subject);

    res.status(result.success ? 200 : 500).json(result);

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: error.message });
  }
});



// =========================
// VERIFY SMTP
// =========================
router.get('/verify', async (req, res) => {
  try {
    const { senderEmail } = req.query;
    const result = await emailService.verifyConnection(senderEmail);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
