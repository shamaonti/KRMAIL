const express = require("express");
const router = express.Router();
const db = require("../db");

// GET templates by user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const [rows] = await db.query(
      `SELECT id, user_id, name, subject, content, template_type, is_default, created_at, updated_at
       FROM email_templates
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get templates error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE template
router.post("/", async (req, res) => {
  try {
    const { user_id, name, subject, content, template_type, is_default } = req.body;

    if (!user_id || !name || !subject || !content) {
      return res.status(400).json({ success: false, message: "user_id, name, subject, content required" });
    }

    const type = template_type || "marketing";
    const isDefault = is_default ? 1 : 0;

    // If setting default, unset others for this user
    if (isDefault) {
      await db.query(`UPDATE email_templates SET is_default = 0 WHERE user_id = ?`, [user_id]);
    }

    const [result] = await db.query(
      `INSERT INTO email_templates (user_id, name, subject, content, template_type, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, name, subject, content, type, isDefault]
    );

    const [rows] = await db.query(`SELECT * FROM email_templates WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Create template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE template
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, name, subject, content, template_type, is_default } = req.body;

    if (!user_id) return res.status(400).json({ success: false, message: "user_id required" });

    const type = template_type || "marketing";
    const isDefault = is_default ? 1 : 0;

    // If setting default, unset others for this user
    if (isDefault) {
      await db.query(`UPDATE email_templates SET is_default = 0 WHERE user_id = ?`, [user_id]);
    }

    const [result] = await db.query(
      `UPDATE email_templates
       SET name = ?, subject = ?, content = ?, template_type = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [name, subject, content, type, isDefault, id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const [rows] = await db.query(`SELECT * FROM email_templates WHERE id = ?`, [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Update template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE template
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const [result] = await db.query(
      `DELETE FROM email_templates WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DUPLICATE template
router.post("/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "user_id required" });

    const [rows] = await db.query(
      `SELECT name, subject, content, template_type
       FROM email_templates
       WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, message: "Template not found" });

    const t = rows[0];
    const [result] = await db.query(
      `INSERT INTO email_templates (user_id, name, subject, content, template_type, is_default)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [user_id, `${t.name} (Copy)`, t.subject, t.content, t.template_type]
    );

    const [created] = await db.query(`SELECT * FROM email_templates WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, data: created[0] });
  } catch (err) {
    console.error("Duplicate template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;