// Form relay: forwards submissions to the site owner's inbox. The destination address lives only in the
// CONTACT_TO environment variable, so it never appears in the website's code.
const { send } = require("./_lib");
const hits = new Map();
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "x";
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (list.length > 20) return send(res, 429, { error: "Too many submissions. Please try again later." });
  list.push(now); hits.set(ip, list);
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (body._honey || body.company_website) return send(res, 200, { ok: true });
  const to = process.env.CONTACT_TO;
  if (!to) return send(res, 500, { error: "Form relay not configured" });
  const type = String(body._type || "inquiry").slice(0, 40);
  const clean = {};
  Object.keys(body).slice(0, 60).forEach(k => {
    if (k === "_honey" || k === "company_website") return;
    const v = body[k];
    clean[k] = (typeof v === "object" ? JSON.stringify(v) : String(v)).slice(0, 4000);
  });
  clean._subject = `Smart.Market — new ${type} submission`;
  clean._template = "table";
  clean._captcha = "false";
  if (clean.email) clean._replyto = clean.email;
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${to}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: "https://smart.market", Referer: "https://smart.market/" },
      body: JSON.stringify(clean)
    });
    const j = await r.json().catch(() => ({}));
    send(res, 200, { ok: true, relayed: String(j.success) === "true" });
  } catch (e) {
    send(res, 502, { error: "relay_failed" });
  }
};
