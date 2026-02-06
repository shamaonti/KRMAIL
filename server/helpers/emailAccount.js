const db = require("../db");

async function getLatestEmailAccount(userId) {
  userId = Number(userId);

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
    [userId]
  );

  if (!rows.length) throw new Error("No email account configured");

  return rows[0];
}

async function getEmailAccountByAddress(userId, email) {
  userId = Number(userId);

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
    [userId, email]
  );

  return rows[0];
}

async function getAllEmailAccounts(userId) {
  userId = Number(userId);

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
    [userId]
  );

  return rows;
}

module.exports = {
  getLatestEmailAccount,
  getEmailAccountByAddress,
  getAllEmailAccounts
};
