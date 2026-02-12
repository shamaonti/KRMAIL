// server/services/imapSync.js
const { simpleParser } = require("mailparser");
const db = require("../db");
const { getAllEmailAccounts } = require("../helpers/emailAccount");
const { createImapClient } = require("../helpers/imapClient");

// ─────────────────────────────────────────────
//  REPLY DETECTION
//  Agar incoming email ka From = kisi campaign lead ka email
//  aur To = hamara sent_from_email  →  replied_at update karo
// ─────────────────────────────────────────────
async function markReplyIfExists(userId, accountEmail, fromEmail, toEmail, subject) {
  try {
    // Normalize
    const from = String(fromEmail || "").toLowerCase().trim();
    const to   = String(toEmail   || "").toLowerCase().trim();

    if (!from || !to) return;

    // Check if this "from" email exists in campaign_data as a lead
    // who was sent from "to" (our account), and hasn't replied yet
    const [rows] = await db.query(
      `SELECT cd.id
       FROM campaign_data cd
       JOIN email_campaigns ec ON ec.id = cd.campaign_id
       WHERE ec.user_id              = ?
         AND LOWER(TRIM(cd.email))           = ?
         AND LOWER(TRIM(cd.sent_from_email)) = ?
         AND cd.status               = 'sent'
         AND cd.replied_at           IS NULL
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

// ─────────────────────────────────────────────
//  SYNC INBOX FOR ONE USER
// ─────────────────────────────────────────────
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

    // Get last synced UID for this account
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
                const toEmail   = mail.to?.value?.[0]?.address   || mail.to?.text   || "";

                // ✅ Store in inbox_emails
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
                    mail.text    || "",
                    (mail.text || "").slice(0, 120),
                    mail.date || new Date(),
                  ]
                );

                console.log(`📩 Stored [${account.email}]:`, mail.subject);

                // ✅ Check if this is a reply to one of our campaign emails
                await markReplyIfExists(
                  userId,
                  account.email,
                  fromEmail,
                  toEmail,
                  mail.subject || ""
                );

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