const { simpleParser } = require("mailparser");
const db = require("../db");
const { getLatestEmailAccount } = require("../helpers/emailAccount");
const { createImapClient } = require("../helpers/imapClient");

async function syncInboxForUser(userId) {
  let account;
  try {
    account = await getLatestEmailAccount(db, userId);
  } catch {
    return;
  }

  if (!account.imap_host) return;

  // 🔥 Get last stored UID
  const [[last]] = await db.query(
    "SELECT MAX(imap_uid) AS lastUid FROM inbox_emails WHERE user_id = ?",
    [userId]
  );

  const lastUid = last?.lastUid || 0;

  const imap = createImapClient(account);

  imap.once("ready", () => {
    imap.openBox("INBOX", true, () => {

      // ✅ ONLY fetch mails AFTER last UID
      imap.search([["UID", `${lastUid + 1}:*`]], (err, results) => {
        if (err || !results || !results.length) {
          imap.end();
          return;
        }

        const fetcher = imap.fetch(results, {
          bodies: "",
          struct: true
        });

        fetcher.on("message", (msg) => {
          let uid;

          msg.once("attributes", (attrs) => {
            uid = attrs.uid;
          });

          msg.once("body", async (stream) => {
            try {
              const mail = await simpleParser(stream);

              await db.query(
                `
                INSERT INTO inbox_emails
                (
                  user_id,
                  imap_uid,
                  from_email,
                  to_email,
                  subject,
                  body,
                  preview,
                  received_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                  userId,
                  uid,
                  mail.from?.text || "",
                  mail.to?.text || "",
                  mail.subject || "",
                  mail.text || "",
                  mail.text?.slice(0, 120) || "",
                  mail.date || new Date()
                ]
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

module.exports = { syncInboxForUser };
