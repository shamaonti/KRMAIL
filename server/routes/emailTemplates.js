const express = require("express");
const router = express.Router();
const db = require("../db");

// GET templates by user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }

    const [rows] = await db.query(
      `SELECT id, name, subject, content, template_type, is_default
       FROM email_templates
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        subject: r.subject,
        content: r.content,
        template_type: r.template_type,
        isDefault: !!r.is_default,
        contentType: "html" // frontend compatibility
      }))
    });

  } catch (err) {
    console.error("Get templates error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;