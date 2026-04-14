const db = require("../db");
const { syncInboxForUser } = require("./imapSync");

let isRunning = false;

async function runInboxSync() {
  if (isRunning) {
    console.log("IMAP cron skipped because previous cycle is still running");
    return;
  }

  isRunning = true;

  try {
    console.log("IMAP cron started...");

    const [users] = await db.query(
      `SELECT DISTINCT user_id
       FROM user_email_accounts
       WHERE user_id IS NOT NULL
         AND imap_host IS NOT NULL
         AND TRIM(imap_host) <> ""`
    );

    for (const row of users) {
      const userId = Number(row.user_id);
      if (!Number.isInteger(userId) || userId <= 0) continue;

      console.log("Sync inbox for user:", userId);
      await syncInboxForUser(userId);
    }

    console.log("IMAP cron cycle completed");
  } catch (error) {
    console.error("IMAP CRON ERROR:", error.message);
  } finally {
    isRunning = false;
  }
}

setInterval(runInboxSync, 60 * 1000);
runInboxSync();

module.exports = { runInboxSync };
