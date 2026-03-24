// server/services/imapSync.js
const { simpleParser } = require("mailparser");
const db = require("../db");
const { getAllEmailAccounts } = require("../helpers/emailAccount");
const { createImapClient } = require("../helpers/imapClient");

async function markReplyIfExists(userId, accountEmail, fromEmail, toEmail, subject) {
  try {
    const from = String(fromEmail || "").toLowerCase().trim();
    const to = String(toEmail || "").toLowerCase().trim();

    if (!from || !to) return;

    const [rows] = await db.query(
      `SELECT cd.id
       FROM campaign_data cd
       JOIN email_campaigns ec ON ec.id = cd.campaign_id
       WHERE ec.user_id = ?
         AND LOWER(TRIM(cd.email)) = ?
         AND LOWER(TRIM(cd.sent_from_email)) = ?
         AND cd.status = 'sent'
         AND cd.replied_at IS NULL
       LIMIT 1`,
      [userId, from, to]
    );

    if (!rows.length) return;

    const cdId = rows[0].id;

    await db.query(
      `UPDATE campaign_data
       SET replied_at = NOW()
       WHERE id = ?`,
      [cdId]
    );

    console.log(`💬 Reply detected! cd.id=${cdId} from ${from} → replied_at set`);
  } catch (e) {
    console.error("❌ markReplyIfExists error:", e.message);
  }
}

async function autoCreateCampaignFromCsv(userId, accountEmail, csvAttachment, subject, fromEmail, uid) {
  try {
    const csvText = csvAttachment.content.toString('utf8');
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const leads = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const lead = {};
      headers.forEach((h, i) => { lead[h] = values[i] || ''; });
      return lead;
    }).filter(l => l.email);

    if (!leads.length) {
      console.log('⚠️ No valid leads found in CSV');
      return;
    }

    const [templates] = await db.query(
      `SELECT id, subject, content FROM email_templates 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!templates.length) {
      console.log('⚠️ No email template found for user:', userId);
      return;
    }

    const template = templates[0];

    const [accounts] = await db.query(
      `SELECT id FROM user_email_accounts WHERE user_id = ? AND from_email = ?`,
      [userId, accountEmail]
    );

    const inboxAccountId = accounts[0]?.id || null;

    const campaignName = `Auto - ${csvAttachment.filename} - uid:${uid} - ${new Date().toLocaleDateString()}`;
    
    const [result] = await db.query(
      `INSERT INTO email_campaigns 
       (user_id, name, subject, content, template_id, status, total_recipients, 
        has_followup, inbox_account_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, 0, ?, NOW())`,
      [userId, campaignName, template.subject, template.content, 
       template.id, leads.length, inboxAccountId]
    );

    const campaignId = result.insertId;

    const values = leads.map(l => [
      campaignId,
      l.email,
      l.name || l.first_name || null,
      JSON.stringify(l),
      csvAttachment.filename
    ]);

    await db.query(
      `INSERT IGNORE INTO campaign_data (campaign_id, email, name, payload, csv_name) VALUES ?`,
      [values]
    );

    console.log(`🚀 Auto campaign created! ID: ${campaignId}, Leads: ${leads.length}`);
  } catch (e) {
    console.error('❌ Auto campaign creation error:', e.message);
  }
}

async function syncInboxForUser(userId) {
  let accounts;

  try {
    accounts = await getAllEmailAccounts(userId);
  } catch (e) {
    console.log("⚠️ No email accounts for user:", userId);
    return;
  }

  if (!accounts || !accounts.length) return;

  for (const account of accounts) {
    if (!account.imap_host) continue;

    const [[last]] = await db.query(
      "SELECT MAX(imap_uid) AS lastUid FROM inbox_emails WHERE user_id = ? AND account_email = ?",
      [userId, account.email]
    );

    const lastUid = last?.lastUid || 0;

    const imap = createImapClient(account);

    imap.once("ready", () => {
      imap.openBox("INBOX", false, () => {
        imap.search([["UID", `${lastUid + 1}:*`]], (err, results) => {
          if (err || !results || !results.length) {
            imap.end();
            return;
          }

          const fetcher = imap.fetch(results, {
            bodies: "",
            struct: true,
          });

          fetcher.on("message", (msg) => {
            let uid;

            msg.once("attributes", (attrs) => {
              uid = attrs.uid;
            });

            msg.once("body", async (stream) => {
              try {
                const mail = await simpleParser(stream);

                const fromEmail = mail.from?.value?.[0]?.address || mail.from?.text || "";
                const toEmail = mail.to?.value?.[0]?.address || mail.to?.text || "";

                await db.query(
                  `INSERT IGNORE INTO inbox_emails
                   (user_id, account_email, imap_uid, from_email, to_email,
                    subject, body, preview, received_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    userId,
                    account.email,
                    uid,
                    fromEmail,
                    toEmail,
                    mail.subject || "",
                    mail.text || "",
                    (mail.text || "").slice(0, 120),
                    mail.date || new Date(),
                  ]
                );

                console.log(`📩 Stored [${account.email}]:`, mail.subject);

                await markReplyIfExists(
                  userId,
                  account.email,
                  fromEmail,
                  toEmail,
                  mail.subject || ""
                );

                // ✅ CHECK FOR CSV ATTACHMENT
                if (mail.attachments && mail.attachments.length > 0) {
                  const csvAttachment = mail.attachments.find(a => 
                    a.filename && a.filename.toLowerCase().endsWith('.csv')
                  );
                  if (csvAttachment && account.email === 'clawbot@speedtech.life') {
                    console.log(`📎 CSV found: ${csvAttachment.filename}`);
                    const [existing] = await db.query(
                      `SELECT id FROM email_campaigns 
                       WHERE user_id = ? AND name LIKE ? LIMIT 1`,
                      [userId, `Auto - ${csvAttachment.filename} - uid:${uid}%`]
                    );
                    if (existing.length > 0) {
                      console.log('⚠️ Campaign already exists for this CSV, skipping...');
                    } else {
                      await autoCreateCampaignFromCsv(
                        userId,
                        account.email,
                        csvAttachment,
                        mail.subject || 'Auto Campaign',
                        fromEmail,
                        uid
                      );
                    }
                  }
                }
              } catch (e) {
                console.error("MAIL STORE ERROR:", e.message);
              }
            });
          });

          fetcher.once("end", () => imap.end());
        });
      });
    });

    imap.once("error", (err) => {
      console.error("IMAP ERROR:", err.message);
    });

    imap.connect();
  }
}

module.exports = { syncInboxForUser };