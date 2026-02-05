const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// =======================
// REGISTER
// =======================
router.post('/register', async (req, res) => {
  console.log("REGISTER BODY:", req.body);

  const name =
    req.body.name ||
    req.body.fullName ||
    req.body.username;

  const email = req.body.email;

  const password =
    req.body.password ||
    req.body.pass;

  const company =
    req.body.company ||
    req.body.companyName ||
    req.body.organization;

  const city =
    req.body.city ||
    req.body.cityName ||
    req.body.location;

  const country =
    req.body.country ||
    req.body.countryName;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password are required'
    });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users
      (name, email, company, city, country, password, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        name,
        email,
        company || null,
        city || null,
        country || null,
        passwordHash
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =======================
// LOGIN
// =======================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    req.session.user = { id: user.id, email: user.email };

    res.json({
      success: true,
      message: 'Login successful',
      user
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =======================
// UPDATE PROFILE (SAVE CHANGES + OTHER SETTINGS)
// =======================
router.put('/update-profile', async (req, res) => {
  const {
    userId,
    name,
    company,
    city,
    country,
    security,
    notifications,
    integrations,
    billing,
    feedback
  } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  try {
    // 1️⃣ Update main users table (existing)
    await pool.query(
      `UPDATE users
       SET name = ?, company = ?, city = ?, country = ?
       WHERE id = ?`,
      [
        name || null,
        company || null,
        city || null,
        country || null,
        userId
      ]
    );

    // 2️⃣ Update Security table
    if (security) {
      const { password, twoFAEnabled, apiKey } = security;
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      await pool.query(
        `INSERT INTO user_security (user_id, password, two_fa_enabled, api_key)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           password = VALUES(password),
           two_fa_enabled = VALUES(two_fa_enabled),
           api_key = VALUES(api_key)`,
        [userId, hashedPassword, twoFAEnabled || 0, apiKey || null]
      );
    }

    // 3️⃣ Update Notifications table
    if (notifications) {
      const { emailAlerts, smsAlerts } = notifications;
      await pool.query(
        `INSERT INTO user_notifications (user_id, email_alerts, sms_alerts)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           email_alerts = VALUES(email_alerts),
           sms_alerts = VALUES(sms_alerts)`,
        [userId, emailAlerts || 0, smsAlerts || 0]
      );
    }

    // 4️⃣ Update Integrations table
    if (integrations) {
      const { googleDrive, slack } = integrations;
      await pool.query(
        `INSERT INTO user_integrations (user_id, google_drive, slack)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           google_drive = VALUES(google_drive),
           slack = VALUES(slack)`,
        [userId, googleDrive || 0, slack || 0]
      );
    }

    // 5️⃣ Update Billing table
    if (billing) {
      const { plan, cardLast4 } = billing;
      await pool.query(
        `INSERT INTO user_billing (user_id, plan, card_last4)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           plan = VALUES(plan),
           card_last4 = VALUES(card_last4)`,
        [userId, plan || null, cardLast4 || null]
      );
    }

    // 6️⃣ Update Feedback table
    if (feedback) {
      const { rating, comments } = feedback;
      await pool.query(
        `INSERT INTO user_feedback (user_id, rating, comments)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           rating = VALUES(rating),
           comments = VALUES(comments)`,
        [userId, rating || null, comments || null]
      );
    }

    res.json({
      success: true,
      message: 'Profile & settings updated successfully'
    });

  } catch (err) {
    console.error('UPDATE PROFILE ERROR:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
