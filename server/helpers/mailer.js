const nodemailer = require("nodemailer");

function createTransporter(account) {
  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_security === "ssl",
    auth: {
      user: account.smtp_user || account.email,   // ✅ FIX
      pass: account.app_password                  // ✅ FIX
    }
  });
}

module.exports = { createTransporter };
