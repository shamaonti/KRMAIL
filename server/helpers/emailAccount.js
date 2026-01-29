// server/helpers/emailAccount.js

async function getLatestEmailAccount(db, userId) {
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

  if (!rows.length) {
    throw new Error("No email account configured for this user");
  }

  return rows[0];
}

module.exports = { getLatestEmailAccount };
