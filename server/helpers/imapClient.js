const Imap = require("imap");

function createImapClient(account) {
  return new Imap({
    user: account.imap_username || account.email,
    password: account.imap_password || account.app_password,
    host: account.imap_host,
    port: account.imap_port,
    tls: account.imap_security === "ssl",

    tlsOptions: {
      rejectUnauthorized: false // 🔥 ALLOW self-signed cert
    }
  });
}

module.exports = { createImapClient };
