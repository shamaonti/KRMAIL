const express = require("express");
const router = express.Router();
const pool = require("../db"); // mysql2/promise style

router.post("/save", async (req, res) => {
  const { name, email, role, description } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({
      success: false,
      message: "Name, Email, and Role are required",
    });
  }

  try {
    // Clean email
    const emailClean = email.trim().toLowerCase();

    // Lookup userId from users table
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = ?",
      [emailClean]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
      });
    }

    const userId = rows[0].id; // ✅ Correct

    // Insert into user_roles
    const sql = `
      INSERT INTO user_roles (
        user_id,
        name,
        email,
        role,
        description
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const values = [userId, name, emailClean, role, description || null];

    await pool.query(sql, values);

    return res.json({
      success: true,
      message: "Role saved successfully",
    });

  } catch (err) {
    console.error("❌ ROLE SAVE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
