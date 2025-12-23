// server/routes/leads.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// mysql2/promise -> [rows, fields]
async function q(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

function splitNameFromEmail(email = "") {
  const local = String(email).split("@")[0] || "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return { first_name: "Unknown", last_name: "" };
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
  return { first_name: cap(parts[0]) || "Unknown", last_name: cap(parts.slice(1).join(" ")) || "" };
}

function normTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map(t => t.trim()).filter(Boolean).join(", ");
  if (typeof tags === "string") return tags.trim();
  return "";
}

function normalizeLead(raw = {}) {
  const email = String(raw.email || "").trim().toLowerCase();
  let first_name = String(raw.first_name ?? raw.firstName ?? "").trim();
  let last_name = String(raw.last_name ?? raw.lastName ?? "").trim();

  if (!first_name || first_name.toLowerCase() === "unknown") {
    const gen = splitNameFromEmail(email);
    first_name = gen.first_name;
    if (!last_name) last_name = gen.last_name;
  }

  return {
    email,
    first_name,
    last_name,
    company: String(raw.company || "").trim(),
    status: String(raw.status || "New").trim(),
    engagement: String(raw.engagement || "").trim(),
    score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : 0,
    tags: normTags(raw.tags),
  };
}

function sendDbError(res, where, err) {
  console.error(`❌ ${where}:`, err);
  return res.status(500).json({
    message: where,
    error: err?.message || String(err),
    code: err?.code,
  });
}

// ✅ Health check
router.get("/health", (req, res) => res.json({ ok: true }));

// ✅ GET all leads
router.get("/", async (req, res) => {
  try {
    const rows = await q("SELECT * FROM leads ORDER BY id DESC");
    return res.json(rows);
  } catch (err) {
    return sendDbError(res, "Failed to fetch leads", err);
  }
});

// ✅ GET one lead
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await q("SELECT * FROM leads WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) return res.status(404).json({ message: "Lead not found" });
    return res.json(rows[0]);
  } catch (err) {
    return sendDbError(res, "Failed to fetch lead", err);
  }
});

// ✅ CREATE lead
router.post("/", async (req, res) => {
  try {
    const lead = normalizeLead(req.body);
    if (!lead.email) return res.status(400).json({ message: "Email is required" });

    const dup = await q("SELECT id FROM leads WHERE email = ? LIMIT 1", [lead.email]);
    if (dup.length) return res.status(409).json({ message: "Email already exists" });

    const result = await db.query(
      `INSERT INTO leads (email, first_name, last_name, company, status, engagement, score, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lead.email, lead.first_name, lead.last_name, lead.company, lead.status, lead.engagement, lead.score, lead.tags]
    );

    const insertId = Array.isArray(result) ? result[0]?.insertId : result?.insertId;
    return res.status(201).json({ message: "Lead created", id: insertId });
  } catch (err) {
    return sendDbError(res, "Failed to create lead", err);
  }
});

// ✅ UPDATE lead
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const lead = normalizeLead(req.body);

    if (lead.email) {
      const dup = await q("SELECT id FROM leads WHERE email = ? AND id <> ? LIMIT 1", [lead.email, id]);
      if (dup.length) return res.status(409).json({ message: "Email already exists" });
    }

    await q(
      `UPDATE leads
       SET email = COALESCE(?, email),
           first_name = ?,
           last_name = ?,
           company = ?,
           status = ?,
           engagement = ?,
           score = ?,
           tags = ?
       WHERE id = ?`,
      [lead.email || null, lead.first_name, lead.last_name, lead.company, lead.status, lead.engagement, lead.score, lead.tags, id]
    );

    return res.json({ message: "Lead updated" });
  } catch (err) {
    return sendDbError(res, "Failed to update lead", err);
  }
});

// ✅ DELETE lead
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await q("DELETE FROM leads WHERE id = ?", [id]);
    return res.json({ message: "Lead deleted" });
  } catch (err) {
    return sendDbError(res, "Failed to delete lead", err);
  }
});

// ✅ BULK IMPORT (skips duplicates)
router.post("/bulk", async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.leads) ? req.body.leads : [];
    if (!incoming.length) return res.status(400).json({ message: "No leads provided" });

    const normalized = incoming.map(normalizeLead).filter(l => l.email);
    if (!normalized.length) return res.status(400).json({ message: "No valid leads (email required)" });

    // de-dupe inside CSV
    const seen = new Set();
    const unique = [];
    for (const l of normalized) {
      if (!seen.has(l.email)) {
        seen.add(l.email);
        unique.push(l);
      }
    }

    // skip existing in DB
    const emails = unique.map(l => l.email);
    const placeholders = emails.map(() => "?").join(",");
    const existing = await q(`SELECT email FROM leads WHERE email IN (${placeholders})`, emails);
    const existingSet = new Set(existing.map(r => String(r.email).toLowerCase()));

    const toInsert = unique.filter(l => !existingSet.has(l.email));
    if (!toInsert.length) {
      return res.json({ message: "No new leads to import", inserted: 0, skipped: unique.length });
    }

    const values = [];
    const rowsSql = toInsert
      .map(l => {
        values.push(l.email, l.first_name, l.last_name, l.company, l.status, l.engagement, l.score, l.tags);
        return "(?, ?, ?, ?, ?, ?, ?, ?)";
      })
      .join(",");

    await q(
      `INSERT INTO leads (email, first_name, last_name, company, status, engagement, score, tags)
       VALUES ${rowsSql}`,
      values
    );

    return res.json({
      message: "Bulk import success",
      inserted: toInsert.length,
      skipped: unique.length - toInsert.length,
    });
  } catch (err) {
    return sendDbError(res, "Bulk import failed", err);
  }
});

module.exports = router;
