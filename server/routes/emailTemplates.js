const express = require("express");
const router = express.Router();
const db = require("../db");

// ─── Helper: fetch follow-up children for a list of template IDs ─────────────
async function fetchFollowups(parentIds) {
  if (!parentIds.length) return [];
  const placeholders = parentIds.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT id, parent_template_id, name, subject, content,
            template_type, followup_order, delay_days, send_condition,
            is_default, created_at, updated_at
     FROM email_templates
     WHERE parent_template_id IN (${placeholders})
     ORDER BY parent_template_id, followup_order ASC`,
    parentIds
  );
  return rows;
}

// ─── GET /api/email-templates?userId=X ───────────────────────────────────────
// Returns only MAIN templates (parent_template_id IS NULL)
// Each template includes a `followups` array of its children
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    // 1. Fetch main templates only
    const [mainRows] = await db.query(
      `SELECT id, user_id, name, subject, content, template_type,
              is_default, created_at, updated_at
       FROM email_templates
       WHERE user_id = ? AND parent_template_id IS NULL
       ORDER BY is_default DESC, updated_at DESC`,
      [userId]
    );

    if (mainRows.length === 0) return res.json({ success: true, data: [] });

    // 2. Fetch all follow-up children for these templates
    const mainIds = mainRows.map((r) => r.id);
    const followupRows = await fetchFollowups(mainIds);

    // 3. Group followups by parent_template_id
    const followupMap = {};
    for (const fu of followupRows) {
      const pid = fu.parent_template_id;
      if (!followupMap[pid]) followupMap[pid] = [];
      followupMap[pid].push({
        id: fu.id,
        name: fu.name,
        subject: fu.subject,
        content: fu.content,
        followup_order: fu.followup_order,
        delay_days: fu.delay_days,
        send_condition: fu.send_condition,
        template_type: fu.template_type,
      });
    }

    // 4. Attach followups to each main template
    const data = mainRows.map((t) => ({
      ...t,
      followups: followupMap[t.id] || [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("Get templates error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/email-templates ────────────────────────────────────────────────
// Creates a main template + its follow-up children in one transaction
// Body: { user_id, name, subject, content, template_type, is_default, followups[] }
// followups[]: [{ content, delay_days, send_condition, followup_order, id? }]
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { user_id, name, subject, content, template_type, is_default, followups = [] } = req.body;

    if (!user_id || !name || !subject || !content) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "user_id, name, subject, content required" });
    }

    const type = template_type || "marketing";
    const isDefault = is_default ? 1 : 0;

    if (isDefault) {
      await conn.query(`UPDATE email_templates SET is_default = 0 WHERE user_id = ?`, [user_id]);
    }

    // Insert main template
    const [result] = await conn.query(
      `INSERT INTO email_templates (user_id, name, subject, content, template_type, is_default,
                                    parent_template_id, followup_order, delay_days, send_condition)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [user_id, name, subject, content, type, isDefault]
    );
    const mainId = result.insertId;

    // Insert follow-up children
    const savedFollowups = [];
    for (let i = 0; i < followups.length; i++) {
      const fu = followups[i];
      const order = fu.followup_order ?? i + 1;
      const [fuResult] = await conn.query(
        `INSERT INTO email_templates
           (user_id, name, subject, content, template_type, is_default,
            parent_template_id, followup_order, delay_days, send_condition)
         VALUES (?, ?, ?, ?, 'followup', 0, ?, ?, ?, ?)`,
        [
          user_id,
          `${name} — Follow-up #${order}`,
          subject,                    // inherits main template subject
          fu.content || "",
          mainId,
          order,
          fu.delay_days ?? 1,
          fu.send_condition ?? "not_opened",
        ]
      );
      savedFollowups.push({
        id: fuResult.insertId,
        followup_order: order,
        delay_days: fu.delay_days ?? 1,
        send_condition: fu.send_condition ?? "not_opened",
        content: fu.content || "",
      });
    }

    await conn.commit();
    conn.release();

    const [rows] = await db.query(`SELECT * FROM email_templates WHERE id = ?`, [mainId]);
    res.status(201).json({ success: true, data: { ...rows[0], followups: savedFollowups } });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Create template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/email-templates/:id ─────────────────────────────────────────────
// Updates main template + upserts follow-up children
// Body: { user_id, name, subject, content, template_type, is_default, followups[] }
// followups[]: [{ id?, content, delay_days, send_condition, followup_order }]
router.put("/:id", async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { user_id, name, subject, content, template_type, is_default, followups = [] } = req.body;

    if (!user_id) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "user_id required" });
    }

    const type = template_type || "marketing";
    const isDefault = is_default ? 1 : 0;

    if (isDefault) {
      await conn.query(`UPDATE email_templates SET is_default = 0 WHERE user_id = ?`, [user_id]);
    }

    // Update main template
    const [result] = await conn.query(
      `UPDATE email_templates
       SET name = ?, subject = ?, content = ?, template_type = ?, is_default = ?
       WHERE id = ? AND user_id = ? AND parent_template_id IS NULL`,
      [name, subject, content, type, isDefault, id, user_id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Collect IDs of follow-ups being kept (those with existing id)
    const keepIds = followups.filter((fu) => fu.id).map((fu) => fu.id);

    // Delete removed follow-ups (children of this parent not in keepIds)
    if (keepIds.length > 0) {
      const placeholders = keepIds.map(() => "?").join(",");
      await conn.query(
        `DELETE FROM email_templates
         WHERE parent_template_id = ? AND id NOT IN (${placeholders})`,
        [id, ...keepIds]
      );
    } else {
      // No existing follow-ups kept — delete all children
      await conn.query(
        `DELETE FROM email_templates WHERE parent_template_id = ?`,
        [id]
      );
    }

    // Upsert follow-ups
    const savedFollowups = [];
    for (let i = 0; i < followups.length; i++) {
      const fu = followups[i];
      const order = fu.followup_order ?? i + 1;

      if (fu.id) {
        // Update existing follow-up
        await conn.query(
          `UPDATE email_templates
           SET content = ?, delay_days = ?, send_condition = ?,
               followup_order = ?, subject = ?, name = ?
           WHERE id = ? AND parent_template_id = ?`,
          [
            fu.content || "",
            fu.delay_days ?? 1,
            fu.send_condition ?? "not_opened",
            order,
            subject,
            `${name} — Follow-up #${order}`,
            fu.id,
            id,
          ]
        );
        savedFollowups.push({ id: fu.id, followup_order: order, delay_days: fu.delay_days, send_condition: fu.send_condition, content: fu.content });
      } else {
        // Insert new follow-up
        const [fuResult] = await conn.query(
          `INSERT INTO email_templates
             (user_id, name, subject, content, template_type, is_default,
              parent_template_id, followup_order, delay_days, send_condition)
           VALUES (?, ?, ?, ?, 'followup', 0, ?, ?, ?, ?)`,
          [
            user_id,
            `${name} — Follow-up #${order}`,
            subject,
            fu.content || "",
            id,
            order,
            fu.delay_days ?? 1,
            fu.send_condition ?? "not_opened",
          ]
        );
        savedFollowups.push({ id: fuResult.insertId, followup_order: order, delay_days: fu.delay_days ?? 1, send_condition: fu.send_condition ?? "not_opened", content: fu.content || "" });
      }
    }

    await conn.commit();
    conn.release();

    const [rows] = await db.query(`SELECT * FROM email_templates WHERE id = ?`, [id]);
    res.json({ success: true, data: { ...rows[0], followups: savedFollowups } });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Update template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/email-templates/:id ─────────────────────────────────────────
// Deletes main template (CASCADE removes follow-up children via FK)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const [result] = await db.query(
      `DELETE FROM email_templates WHERE id = ? AND user_id = ? AND parent_template_id IS NULL`,
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

// ─── POST /api/email-templates/:id/duplicate ─────────────────────────────────
// Duplicates main template AND all its follow-up children
router.post("/:id/duplicate", async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "user_id required" });
    }

    // Fetch main template
    const [rows] = await conn.query(
      `SELECT name, subject, content, template_type
       FROM email_templates WHERE id = ? AND user_id = ? AND parent_template_id IS NULL`,
      [id, user_id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const t = rows[0];
    const [mainResult] = await conn.query(
      `INSERT INTO email_templates (user_id, name, subject, content, template_type, is_default,
                                    parent_template_id, followup_order, delay_days, send_condition)
       VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, NULL, NULL)`,
      [user_id, `${t.name} (Copy)`, t.subject, t.content, t.template_type]
    );
    const newMainId = mainResult.insertId;

    // Duplicate follow-up children
    const followupRows = await fetchFollowups([parseInt(id)]);
    for (const fu of followupRows) {
      await conn.query(
        `INSERT INTO email_templates
           (user_id, name, subject, content, template_type, is_default,
            parent_template_id, followup_order, delay_days, send_condition)
         VALUES (?, ?, ?, ?, 'followup', 0, ?, ?, ?, ?)`,
        [
          user_id,
          fu.name.replace(t.name, `${t.name} (Copy)`),
          fu.subject,
          fu.content,
          newMainId,
          fu.followup_order,
          fu.delay_days,
          fu.send_condition,
        ]
      );
    }

    await conn.commit();
    conn.release();

    const [created] = await db.query(`SELECT * FROM email_templates WHERE id = ?`, [newMainId]);
    res.status(201).json({ success: true, data: created[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Duplicate template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;