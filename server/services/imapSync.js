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

    await db.query(
      `UPDATE campaign_data
       SET replied_at = NOW()
       WHERE id = ?`,
      [rows[0].id]
    );

    console.log(`Reply detected for campaign_data.id=${rows[0].id} from ${from}`);
  } catch (error) {
    console.error("markReplyIfExists error:", error.message);
  }
}

async function autoCreateCampaignFromCsv(userId, accountEmail, csvAttachment, subject, fromEmail, uid) {
  try {
    const csvText = csvAttachment.content.toString("utf8");
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return;

    const headers = lines[0]
      .split(",")
      .map((header) => header.trim().toLowerCase().replace(/"/g, ""));

    const leads = lines
      .slice(1)
      .map((line) => {
        const values = line.split(",").map((value) => value.trim().replace(/"/g, ""));
        const lead = {};
        headers.forEach((header, index) => {
          lead[header] = values[index] || "";
        });
        return lead;
      })
      .filter((lead) => lead.email);

    if (!leads.length) {
      console.log("No valid leads found in CSV");
      return;
    }

    const [templates] = await db.query(
      `SELECT id, subject, content
       FROM email_templates
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!templates.length) {
      console.log("No email template found for user:", userId);
      return;
    }

    const [accounts] = await db.query(
      `SELECT id
       FROM user_email_accounts
       WHERE user_id = ? AND from_email = ?`,
      [userId, accountEmail]
    );

    const template = templates[0];
    const inboxAccountId = accounts[0]?.id || null;
    const campaignName = `Auto - ${csvAttachment.filename} - uid:${uid} - ${new Date().toLocaleDateString()}`;

    const [result] = await db.query(
      `INSERT INTO email_campaigns
       (user_id, name, subject, content, template_id, status, total_recipients,
        has_followup, inbox_account_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, 0, ?, NOW())`,
      [userId, campaignName, template.subject, template.content, template.id, leads.length, inboxAccountId]
    );

    const values = leads.map((lead) => [
      result.insertId,
      lead.email,
      lead.name || lead.first_name || null,
      JSON.stringify(lead),
      csvAttachment.filename,
    ]);

    await db.query(
      `INSERT IGNORE INTO campaign_data (campaign_id, email, name, payload, csv_name)
       VALUES ?`,
      [values]
    );

    console.log(`Auto campaign created. ID=${result.insertId}, leads=${leads.length}`);
  } catch (error) {
    console.error("Auto campaign creation error:", error.message);
  }
}

async function syncSingleAccount(userId, account) {
  const [[last]] = await db.query(
    `SELECT MAX(imap_uid) AS lastUid
     FROM inbox_emails
     WHERE user_id = ? AND account_email = ?`,
    [userId, account.email]
  );

  const lastUid = last?.lastUid || 0;

  await new Promise((resolve) => {
    const imap = createImapClient(account);
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (openErr) => {
        if (openErr) {
          console.error(`IMAP openBox error [${account.email}]:`, openErr.message);
          imap.end();
          return;
        }

        imap.search([["UID", `${lastUid + 1}:*`]], (searchErr, results) => {
          if (searchErr) {
            console.error(`IMAP search error [${account.email}]:`, searchErr.message);
            imap.end();
            return;
          }

          if (!results || !results.length) {
            imap.end();
            return;
          }

          const fetcher = imap.fetch(results, {
            bodies: "",
            struct: true,
          });

          fetcher.on("message", (msg) => {
            let uid = null;
            let parsedMail = null;

            msg.once("attributes", (attrs) => {
              uid = attrs.uid || null;
            });

            msg.once("body", async (stream) => {
              try {
                parsedMail = await simpleParser(stream);
              } catch (error) {
                console.error(`MAIL PARSE ERROR [${account.email}]:`, error.message);
              }
            });

            msg.once("end", async () => {
              try {
                if (!uid || !parsedMail) return;

                const [existingRows] = await db.query(
                  `SELECT id
                   FROM inbox_emails
                   WHERE user_id = ? AND account_email = ? AND imap_uid = ?
                   LIMIT 1`,
                  [userId, account.email, uid]
                );

                if (existingRows.length > 0) {
                  return;
                }

                const fromEmail =
                  parsedMail.from?.value?.[0]?.address || parsedMail.from?.text || "";
                const toEmail =
                  parsedMail.to?.value?.[0]?.address || parsedMail.to?.text || "";

                await db.query(
                  `INSERT INTO inbox_emails
                   (user_id, account_email, imap_uid, from_email, to_email, subject, body, preview, received_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    userId,
                    account.email,
                    uid,
                    fromEmail,
                    toEmail,
                    parsedMail.subject || "",
                    parsedMail.text || "",
                    (parsedMail.text || "").slice(0, 120),
                    parsedMail.date || new Date(),
                  ]
                );

                console.log(`Stored [${account.email}] uid=${uid}:`, parsedMail.subject);

                await markReplyIfExists(
                  userId,
                  account.email,
                  fromEmail,
                  toEmail,
                  parsedMail.subject || ""
                );

                if (parsedMail.attachments?.length) {
                  const csvAttachment = parsedMail.attachments.find(
                    (attachment) =>
                      attachment.filename &&
                      attachment.filename.toLowerCase().endsWith(".csv")
                  );

                  if (csvAttachment && account.email === "clawbot@speedtech.life") {
                    console.log(`CSV found: ${csvAttachment.filename}`);
                    const [existing] = await db.query(
                      `SELECT id
                       FROM email_campaigns
                       WHERE user_id = ? AND name LIKE ?
                       LIMIT 1`,
                      [userId, `Auto - ${csvAttachment.filename} - uid:${uid}%`]
                    );

                    if (existing.length === 0) {
                      await autoCreateCampaignFromCsv(
                        userId,
                        account.email,
                        csvAttachment,
                        parsedMail.subject || "Auto Campaign",
                        fromEmail,
                        uid
                      );
                    } else {
                      console.log("Campaign already exists for this CSV, skipping");
                    }
                  }
                }
              } catch (error) {
                console.error(`MAIL STORE ERROR [${account.email}]:`, error.message);
              }
            });
          });

          fetcher.once("error", (error) => {
            console.error(`IMAP FETCH ERROR [${account.email}]:`, error.message);
            imap.end();
          });

          fetcher.once("end", () => {
            imap.end();
          });
        });
      });
    });

    imap.once("error", (error) => {
      console.error(`IMAP ERROR [${account.email}]:`, error.message);
      finish();
    });

    imap.once("close", finish);
    imap.once("end", finish);
    imap.connect();
  });
}

async function syncInboxForUser(userId) {
  let accounts;

  try {
    accounts = await getAllEmailAccounts(userId);
  } catch (error) {
    console.log("No email accounts for user:", userId);
    return;
  }

  if (!accounts?.length) return;

  for (const account of accounts) {
    if (!account.imap_host) continue;
    await syncSingleAccount(userId, account);
  }
}

module.exports = { syncInboxForUser };
