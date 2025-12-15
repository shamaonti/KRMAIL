const express = require("express");
const router = express.Router();
const db = require("../db");

const multer = require("multer");
const { parse } = require("csv-parse/sync");

// upload config (memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// helper: safe CSV value
function toStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

// helper: CSV escape
function csvEscape(v) {
  const s = toStr(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ✅ GET all leads
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM leads ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Fetch leads error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// ✅ ADD a new lead
router.post("/", async (req, res) => {
  try {
    const {
      email,
      first_name = "",
      last_name = "",
      company = "",
      status = "Cold",
      engagement = "Low",
      score = 0,
      tags = "",
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const [result] = await db.query(
      `INSERT INTO leads 
       (email, first_name, last_name, company, status, engagement, score, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        first_name,
        last_name,
        company,
        status,
        engagement,
        Number(score) || 0,
        tags,
      ]
    );

    const [rows] = await db.query("SELECT * FROM leads WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Lead with this email already exists" });
    }
    console.error("Add lead error:", err);
    res.status(500).json({ error: "Failed to add lead" });
  }
});

// ✅ EXPORT CSV  (GET /api/leads/export)
router.get("/export", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, email, first_name, last_name, company, status, engagement, score, tags, created_at
       FROM leads
       ORDER BY created_at DESC`
    );

    const header = [
      "Email",
      "First Name",
      "Last Name",
      "Company",
      "Status",
      "Engagement",
      "Score",
      "Tags",
      "Created At",
    ];

    const lines = [];
    lines.push(header.join(","));

    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.email),
          csvEscape(r.first_name),
          csvEscape(r.last_name),
          csvEscape(r.company),
          csvEscape(r.status),
          csvEscape(r.engagement),
          csvEscape(r.score),
          csvEscape(r.tags),
          csvEscape(r.created_at),
        ].join(",")
      );
    }

    const csv = lines.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="leads.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error("Export CSV error:", err);
    res.status(500).json({ error: "Failed to export leads" });
  }
});

// ✅ IMPORT CSV (POST /api/leads/import)  (expects form-data key: file)
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const csvText = req.file.buffer.toString("utf-8");

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });

    let inserted = 0;
    let skipped = 0;

    // Insert ignoring duplicates (email must be UNIQUE in DB)
    for (const row of records) {
      // accept both styles of headers
      const email =
        toStr(row.email) || toStr(row.Email) || toStr(row["E-mail"]) || "";
      const first_name = toStr(row.first_name) || toStr(row["First Name"]);
      const last_name = toStr(row.last_name) || toStr(row["Last Name"]);
      const company = toStr(row.company) || toStr(row.Company);

      if (!email) {
        skipped++;
        continue;
      }

      const status = toStr(row.status) || toStr(row.Status) || "Cold";
      const engagement =
        toStr(row.engagement) || toStr(row.Engagement) || "Low";
      const scoreRaw = toStr(row.score) || toStr(row.Score) || "0";
      const score = Number(scoreRaw) || 0;
      const tags = toStr(row.tags) || toStr(row.Tags) || "";

      // INSERT IGNORE = if duplicate email -> ignore (no crash)
      const [result] = await db.query(
        `INSERT IGNORE INTO leads
         (email, first_name, last_name, company, status, engagement, score, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, first_name, last_name, company, status, engagement, score, tags]
      );

      if (result.affectedRows === 1) inserted++;
      else skipped++;
    }

    res.json({
      message: "Import completed",
      inserted,
      skipped,
      total: records.length,
    });
  } catch (err) {
    console.error("Import CSV error:", err);
    res.status(500).json({ error: "Failed to import CSV" });
  }
});

module.exports = router;
