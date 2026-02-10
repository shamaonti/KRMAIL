const crypto = require("crypto");

const SECRET = process.env.UNSUBSCRIBE_SECRET || "change_this_secret";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payloadObj) {
  const payloadJson = JSON.stringify(payloadObj);
  const payloadB64 = base64url(payloadJson);

  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${payloadB64}.${sig}`;
}

function verify(token) {
  const [payloadB64, sig] = (token || "").split(".");
  if (!payloadB64 || !sig) return { ok: false };

  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (
    expectedSig.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))
  ) {
    return { ok: false };
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64")
      .toString()
  );

  if (payload.exp && Date.now() > payload.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

module.exports = { sign, verify };
