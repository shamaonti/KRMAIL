const db = require("../db");
const { syncInboxForUser } = require("./imapSync");

async function runInboxSync() {
  try {
    console.log("⏳ IMAP cron started...");

    const [users] = await db.query(
      "SELECT DISTINCT user_id FROM user_email_accounts"
    );

    for (const u of users) {
      console.log("📥 Sync inbox for user:", u.user_id);
      await syncInboxForUser(u.user_id);
    }

    console.log("✅ IMAP cron cycle completed");
  } catch (err) {
    console.error("❌ IMAP CRON ERROR:", err);
  }
}

// 🔁 every 60 seconds
setInterval(runInboxSync, 60 * 1000);

// 🔥 run immediately on server start
runInboxSync();
