// helpers/mailer.js
const nodemailer = require("nodemailer");

function createTransporter(account) {
  if (!account) {
    throw new Error("SMTP account configuration is missing");
  }

  const host = account.smtp_host;
  const port = Number(account.smtp_port) || 587;
  const security = String(account.smtp_security || "").toLowerCase();

  // Determine SSL vs TLS correctly
  const isSSL = security === "ssl" || port === 465;
  const isTLS = security === "tls" || port === 587;

  console.log("📨 Creating SMTP transporter:");
  console.log("   Host:", host);
  console.log("   Port:", port);
  console.log("   Security:", security);
  console.log("   SSL:", isSSL);
  console.log("   TLS:", isTLS);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSSL, // true only for 465
    auth: {
      user: account.smtp_user || account.email,
      pass: account.app_password,
    },
    ...(isTLS ? { requireTLS: true } : {}), // enforce STARTTLS on 587
    tls: {
      rejectUnauthorized: false, // allow self-signed certs (safe for dev)
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  return transporter;
}

module.exports = { createTransporter };
