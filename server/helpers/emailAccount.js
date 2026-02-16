// helpers/emailAccount.js
const db = require("../db");

function toInt(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

async function getLatestEmailAccount(userId) {
  const uid = toInt(userId);

  // Prevent [object Object], NaN, undefined, etc.
  if (!uid) {
    throw new Error(`Invalid userId in getLatestEmailAccount: ${userId}`);
  }

  const [rows] = await db.query(
    `SELECT
       id,
       user_id,
       from_name,
       from_email      AS email,
       smtp_username   AS smtp_user,
       smtp_password   AS app_password,
       smtp_host,
       smtp_port,
       smtp_security,
       imap_username,
       imap_password,
       imap_host,
       imap_port,
       imap_security
     FROM user_email_accounts
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [uid]
  );

  if (!rows.length) throw new Error("No email account configured");
  return rows[0];
}

async function getEmailAccountByAddress(userId, email) {
  const uid = toInt(userId);
  if (!uid) throw new Error(`Invalid userId in getEmailAccountByAddress: ${userId}`);
  if (!email || typeof email !== "string") throw new Error("Invalid email address");

  const [rows] = await db.query(
    `SELECT
       id,
       user_id,
       from_name,
       from_email      AS email,
       smtp_username   AS smtp_user,
       smtp_password   AS app_password,
       smtp_host,
       smtp_port,
       smtp_security,
       imap_username,
       imap_password,
       imap_host,
       imap_port,
       imap_security
     FROM user_email_accounts
     WHERE user_id = ? AND from_email = ?
     LIMIT 1`,
    [uid, email.trim()]
  );

  return rows[0] || null;
}

async function getAllEmailAccounts(userId) {
  const uid = toInt(userId);
  if (!uid) throw new Error(`Invalid userId in getAllEmailAccounts: ${userId}`);

  const [rows] = await db.query(
    `SELECT
       id,
       user_id,
       from_name,
       from_email      AS email,
       smtp_username   AS smtp_user,
       smtp_password   AS app_password,
       smtp_host,
       smtp_port,
       smtp_security,
       imap_username,
       imap_password,
       imap_host,
       imap_port,
       imap_security
     FROM user_email_accounts
     WHERE user_id = ? AND imap_host IS NOT NULL`,
    [uid]
  );

  return rows;
}

module.exports = {
  getLatestEmailAccount,
  getEmailAccountByAddress,
  getAllEmailAccounts,
};
