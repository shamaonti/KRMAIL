const db = require("../db");
const { syncInboxForUser } = require("./imapSync");

async function runInboxSync() {
  try {
    console.log("⏳ IMAP cron started...");

    const [users] = await db.query(
      "SELECT DISTINCT user_id FROM user_email_accounts"
    );

    for (const u of users) {
      const userId = Number(u.user_id);
      console.log("📥 Sync inbox for user:", userId);
      await syncInboxForUser(userId);
    }

    console.log("✅ IMAP cron cycle completed");
  } catch (err) {
    console.error("❌ IMAP CRON ERROR:", err);
  }
}

setInterval(runInboxSync, 60 * 1000);
runInboxSync();
